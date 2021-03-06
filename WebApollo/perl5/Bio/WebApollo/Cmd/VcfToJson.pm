#!/usr/bin/env perl

=head1 NAME

Script::VcfToJson - implementation of bin/vcf-to-json.pl

=head1 DESCRIPTION

Do C<perldoc bin/vcf-to-json.pl> for most of the documentation.

=cut

package Bio::WebApollo::Cmd::VcfToJson;

use strict;
use warnings;

use base 'Bio::WebApollo::Cmd::NCFormatter';

use JSON 2;

sub option_defaults {
    ( type => [],
      out => 'data',
      cssClass => 'feature',
      sortMem => 1024 * 1024 * 512,
    )
}

sub option_definitions {
    (
        "gff=s",
        "bed=s",
        "bam=s",
        "vcf=s",
        "out=s",
        "trackLabel=s",
        "key=s",
        "cssClass|className=s",
        "autocomplete=s",
        "getType",
        "getPhase",
        "getSubs|getSubfeatures",
        "getLabel",
        "urltemplate=s",
        "menuTemplate=s",
        "arrowheadClass=s",
        "subfeatureClasses=s",
        "clientConfig=s",
        "thinType=s",
        "thickType=s",
        "type=s@",
        "nclChunk=i",
        "compress",
        "sortMem=i",
        "help|h|?",
    )
}

sub run {
    my ( $self ) = @_;

    Pod::Usage::pod2usage( "Must provide a --trackLabel parameter." ) unless defined $self->opt('trackLabel');
    unless( defined $self->opt('gff') || defined $self->opt('bed') || defined $self->opt('bam') || defined $self->opt('vcf') ) {
        Pod::Usage::pod2usage( "You must supply either a --gff, --bed or --vcf parameter." )
    }

    $self->opt('bam') and die "BAM support has been moved to a separate program: bam-to-json.pl\n";

    if( ! $self->opt('nclChunk') ) {
        # default chunk size is 50KiB
        my $nclChunk = 50000;
        # $nclChunk is the uncompressed size, so we can make it bigger if
        # we're compressing
        $nclChunk *= 4 if $self->opt('compress');
        $self->opt( nclChunk => $nclChunk );
    }

    for my $optname ( qw( clientConfig subfeatureClasses ) ) {
        if( my $o = $self->opt($optname) ) {
            $self->opt( $optname => JSON::from_json( $o ));
        }
    }


    my %config = (
        type         => $self->opt('getType') || $self->opt('type') ? 1 : 0,
        phase        => $self->opt('getPhase'),
        subfeatures  => $self->opt('getSubs'),
        style          => {
            %{ $self->opt('clientConfig') || {} },
            className      => $self->opt('cssClass'),
            ( $self->opt('urltemplate')       ? ( linkTemplate      => $self->opt('urltemplate')       ) : () ),
            ( $self->opt('arrowheadClass')    ? ( arrowheadClass    => $self->opt('arrowheadClass')    ) : () ),
            ( $self->opt('subfeatureClasses') ? ( subfeatureClasses => $self->opt('subfeatureClasses') ) : () ),
        },
        ( $self->opt('menuTemplate') ? ( menuTemplate => $self->opt('menuTemplate') ) : () ),
        key          => defined( $self->opt('key') ) ? $self->opt('key') : $self->opt('trackLabel'),
        compress     => $self->opt('compress'),
     );

    my $feature_stream = 
	$self->opt('vcf') ? $self->make_vcf_stream :
                             die "Please specify --vcf\n";

    # build a filtering subroutine for the features
    my $types = $self->opt('type');
    @$types = split /,/, join ',', @$types;
    my $filter = $self->make_feature_filter( $types );

    $self->_format( trackConfig   => \%config,
                    featureStream => $feature_stream,
                    featureFilter => $filter,
                    trackLabel    => $self->opt('trackLabel')
                  );

    return 0;
}

sub make_vcf_stream {
    my $self = shift;

    require Vcf;
    require Bio::WebApollo::FeatureStream::VCF_LowLevel;

    my $p = Vcf->new( file => $self->opt('vcf') );
    $p->parse_header;

    return Bio::WebApollo::FeatureStream::VCF_LowLevel->new(
        parser => $p,
        track_label => $self->opt('trackLabel')
     );
}

sub make_feature_filter {
    my ( $self, $types ) = @_;

    my @filters;

    # add a filter for type:source if --type was specified
    if( $types && @$types ) {
        my @type_regexes = map {
            my $t = $_;
            $t .= ":.*" unless $t =~ /:/;
            qr/^$t$/
        } @$types;

        push @filters, sub {
            my ($f) = @_;
            my $type = $f->{type}
                or return 0;
            my $source = $f->{source};
            my $t_s = "$type:$source";
            for( @type_regexes ) {
                return 1 if $t_s =~ $_;
            }
            return 0;
        };
    }

    # if no filtering, just return a pass-through now.
    return sub { @_ } unless @filters;

    # make a sub that tells whether a single feature passes
    my $pass_feature = sub {
        my ($f) = @_;
        $_->($f) || return 0 for @filters;
        return 1;
    };

    # Apply this filtering rule through the whole feature hierarchy,
    # returning features that pass.  If a given feature passes, return
    # it *and* all of its subfeatures, with no further filtering
    # applied to the subfeatures.  If a given feature does NOT pass,
    # search its subfeatures to see if they do.
    return sub {
        _find_passing_features( $pass_feature, @_ );
    }
};

# given a subref that says whether an individual feature passes,
# return the LIST of features among the whole feature hierarchy that
# pass the filtering rule
sub _find_passing_features {
    my $pass_feature = shift;
    return map {
        my $feature = $_;
        $pass_feature->( $feature )
            # if this feature passes, we're done, just return it
            ? ( $feature )
            # otherwise, look for passing features in its subfeatures
            : _find_passing_features( $pass_feature, @{$feature->{subfeatures}} );
    } @_;
}

1;
