use strict;
use warnings;


use JBlibs;

use Test::More;
use Test::Warn;

use Bio::JBrowse::Cmd::FlatFileToJson;

use File::Spec::Functions qw( catfile catdir );
use File::Temp ();
use File::Copy::Recursive 'dircopy';

use lib 'tests/perl_tests/lib';
use FileSlurping 'slurp';

sub run_with(@) {
    #system $^X, 'bin/flatfile-to-json.pl', @_;
    #ok( ! $?, 'flatfile-to-json.pl ran ok' );
    my @args = @_;
    #warnings_are {
      Bio::JBrowse::Cmd::FlatFileToJson->new( @args )->run;
    #} [], 'ran without warnings';
}

sub tempdir {
    my $tempdir   = File::Temp->newdir( CLEANUP => $ENV{KEEP_ALL} ? 0 : 1 );
    #diag "using temp dir $tempdir";
    return $tempdir;
}

{  #diag "running on volvox";

    my $tempdir = tempdir();
    my $read_json = sub { slurp( $tempdir, @_ ) };
    dircopy( 'tests/data/volvox_formatted_refseqs', $tempdir );

    run_with (
        '--out' => $tempdir,
        '--bed' => 'sample_data/raw/volvox/volvox-remark.bed',
        '--trackLabel' => 'ExampleFeatures',
        '--key' => 'Example Features',
        '--autocomplete' => 'all',
        '--cssClass' => 'feature2',
        '--clientConfig' =>  '{"featureCss": "height: 8px;", "histScale": 2}',
        '--urltemplate' => 'http://example.com/{name}/{start}/{end}',
        );

    #system "find $tempdir -type f";
    #die 'break';

    run_with (
        '--out' => $tempdir,
        '--gff' => 'sample_data/raw/volvox/volvox.gff3',
        '--trackLabel' => 'CDS',
        '--key' => 'Predicted genes',
        '--type' => 'CDS:predicted,mRNA:exonerate,mRNA:predicted',
        '--autocomplete' => 'all',
        '--cssClass' => 'cds',
        '--compress',
        '--getPhase',
        '--getSubfeatures',
        );

    my $hist_output = $read_json->(qw( tracks ExampleFeatures ctgA hist-10000-0.json ));
    is_deeply( $hist_output, [4,3,4,3,4,1], 'got right histogram output for ExampleFeatures' ) or diag explain( $hist_output );

    my $names_output = $read_json->(qw( tracks ExampleFeatures ctgA names.json ));
    is_deeply( $names_output->[3],
               [
                 [
                   'f05'
                 ],
                 'ExampleFeatures',
                 'f05',
                 'ctgA',
                 4715,
                 5968,
                 undef
               ],
               'got the right names output'
               ) or diag explain $names_output;

    my $cds_trackdata = $read_json->(qw( tracks CDS ctgA trackData.jsonz ));
    is( $cds_trackdata->{featureCount}, 3, 'got right feature count for CDS track' ) or diag explain $cds_trackdata;
    is( scalar( @{$cds_trackdata->{histograms}{meta}}),
        scalar( @{$cds_trackdata->{histograms}{stats}}),
        'have stats for each precalculated hist' );

    is( ref $cds_trackdata->{intervals}{nclist}[2][10], 'ARRAY', 'exonerate mRNA has its subfeatures' )
       or diag explain $cds_trackdata;
    is( scalar @{$cds_trackdata->{intervals}{nclist}[2][10]}, 5, 'exonerate mRNA has 5 subfeatures' );

    my $tracklist = $read_json->('trackList.json');
    is_deeply( $tracklist->{tracks}[1]{style},
               { featureCss   => 'height: 8px;',
                 histScale    => 2,
                 className    => 'feature2',
                 linkTemplate => 'http://example.com/{name}/{start}/{end}'
               },
               '--clientConfig and --urltemplate options seem to work'
             ) or diag explain $tracklist;

    #system "find $tempdir";
}

{#   diag "running on single_au9_gene.gff3, testing --type filtering";

    my $tempdir = tempdir();
    dircopy( 'tests/data/AU9', $tempdir );

    run_with (
        '--out' => $tempdir,
        '--gff' => "tests/data/AU9/single_au9_gene.gff3",
        '--trackLabel' => 'AU_mRNA',
        '--key' => 'AU mRNA',
        '--type' => 'mRNA',
        '--autocomplete' => 'all',
        '--cssClass' => 'transcript',
        '--getPhase',
        '--getSubfeatures',
        );

    #system "find $tempdir";

    my $read_json = sub { slurp( $tempdir, @_ ) };
    my $cds_trackdata = $read_json->(qw( tracks AU_mRNA Group1.33 trackData.json ));
    is( $cds_trackdata->{featureCount}, 1, 'got right feature count' ) or diag explain $cds_trackdata;
    is( ref $cds_trackdata->{intervals}{nclist}[0][10], 'ARRAY', 'mRNA has its subfeatures' )
       or diag explain $cds_trackdata;
    is( scalar @{$cds_trackdata->{intervals}{nclist}[0][10]}, 7, 'mRNA has 7 subfeatures' );

    my $tracklist = $read_json->( 'trackList.json' );
    is( $tracklist->{tracks}[0]{key}, 'AU mRNA', 'got a tracklist' ) or diag explain $tracklist;
    is_deeply( $tracklist->{tracks}[0]{style}, { className => 'transcript' }, 'got the right style' ) or diag explain $tracklist;

    # run it again with a different CSS class, check that it updated
    run_with (
        '--out' => $tempdir,
        '--gff' => "tests/data/AU9/single_au9_gene.gff3",
        '--trackLabel' => 'AU_mRNA',
        '--key' => 'AU mRNA',
        '--type' => 'mRNA',
        '--autocomplete' => 'all',
        '--cssClass' => 'foo_fake_class',
        '--getPhase',
        '--getSubfeatures',
        );

    $tracklist = $read_json->( 'trackList.json' );
    is( $tracklist->{tracks}[0]{key}, 'AU mRNA', 'got a tracklist' );
    is_deeply( $tracklist->{tracks}[0]{style}, { className => 'foo_fake_class'}, 'got the right style' );

    # check that we got the same data as before
    $cds_trackdata = $read_json->(qw( tracks AU_mRNA Group1.33 trackData.json ));
    is( $cds_trackdata->{featureCount}, 1, 'got right feature count' ) or diag explain $cds_trackdata;
    is( ref $cds_trackdata->{intervals}{nclist}[0][10], 'ARRAY', 'mRNA has its subfeatures' )
       or diag explain $cds_trackdata;
    is( scalar @{$cds_trackdata->{intervals}{nclist}[0][10]}, 7, 'mRNA has 7 subfeatures' );
}

{   #diag "running on single_au9_gene.gff3, testing that we emit 2 levels of subfeatures";

    my $tempdir = tempdir();
    dircopy( 'tests/data/AU9', $tempdir );

    run_with (
        '--out' => $tempdir,
        '--gff' => "tests/data/AU9/single_au9_gene.gff3",
        '--trackLabel' => 'AU_mRNA',
        '--key' => 'AU mRNA',
        '--type' => 'gene',
        '--autocomplete' => 'all',
        '--cssClass' => 'transcript',
        '--getPhase',
        '--getSubfeatures',
        );

    #system "find $tempdir";

    my $read_json = sub { slurp( $tempdir, @_ ) };
    my $cds_trackdata = $read_json->(qw( tracks AU_mRNA Group1.33 trackData.json ));
    is( $cds_trackdata->{featureCount}, 1, 'got right feature count' ) or diag explain $cds_trackdata;
    is( ref $cds_trackdata->{intervals}{nclist}[0][10], 'ARRAY', 'gene has its subfeatures' )
       or diag explain $cds_trackdata;
    is( scalar @{$cds_trackdata->{intervals}{nclist}[0][10]}, 1, 'gene has 1 subfeature' );
    is( ref $cds_trackdata->{intervals}{nclist}[0][10][0][10], 'ARRAY', 'mRNA has its subfeatures' )
       or diag explain $cds_trackdata;
    is( scalar @{$cds_trackdata->{intervals}{nclist}[0][10][0][10]}, 7, 'mRNA has 7 subfeatures' );
}

for my $testfile ( "tests/data/au9_scaffold_subset.gff3", "tests/data/au9_scaffold_subset_sync.gff3" ) {
    # add a test for duplicate lazyclasses bug found by Gregg

    my $tempdir = tempdir();
    dircopy( 'tests/data/AU9', $tempdir );
    run_with (
        '--out' => $tempdir,
        '--gff' => $testfile,
        '--arrowheadClass' => 'transcript-arrowhead',
        '--getSubfeatures',
        '--subfeatureClasses' => '{"CDS": "transcript-CDS", "UTR": "transcript-UTR", "exon":"transcript-exon", "three_prime_UTR":"transcript-three_prime_UTR", "five_prime_UTR":"transcript-five_prime_UTR", "stop_codon":null, "start_codon":null}',
        '--cssClass' => 'transcript',
        '--type' => 'mRNA',
        '--trackLabel' => 'au9_full1',
        );

    my $read_json = sub { slurp( $tempdir, @_ ) };
    my $cds_trackdata = $read_json->(qw( tracks au9_full1 Group1.33 trackData.json ));
    is( $cds_trackdata->{featureCount}, 28, 'got right feature count' ) or diag explain $cds_trackdata;
    is( scalar @{$cds_trackdata->{intervals}{classes}}, 5, 'got the right number of classes' )
        or diag explain $cds_trackdata->{intervals}{classes};

    #system "find $tempdir";
}

{
    # test for warnings
    my $tempdir = tempdir();
    run_with (
        '--out' => $tempdir,
        '--gff' => catfile('tests','data','SL2.40ch10_sample.gff3'),
        '--compress',
        '--key' => 'Assembly',
        '--trackLabel' => 'assembly',
        );
    my $read_json = sub { slurp( $tempdir, @_ ) };
    my $trackdata = FileSlurping::slurp_tree( catdir( $tempdir, qw( tracks assembly SL2.40ch10 )));
    is( scalar( grep @{$trackdata->{$_}} == 0,
                grep /^lf/,
                keys %$trackdata
               ),
        0,
        'no empty chunks in trackdata'
      ) or diag explain $trackdata;
}


{
    # test BED import
    my $tempdir = tempdir();
    run_with (
        '--out' => $tempdir,
        '--bed' => catfile('tests','data','foo.bed'),
        '--compress',
        '--key' => 'Fooish Bar Data',
        '--trackLabel' => 'foo',
        );
    my $read_json = sub { slurp( $tempdir, @_ ) };
    my $trackdata = FileSlurping::slurp_tree( catdir( $tempdir, qw( tracks foo chr10 )));
    is( scalar( grep @{$trackdata->{$_}} == 0,
                grep /^lf/,
                keys %$trackdata
               ),
        0,
        'no empty chunks in trackdata'
      ) or diag explain $trackdata;

    is_deeply( $trackdata->{'trackData.jsonz'}{intervals}{classes}[0],
               {
                   'attributes' => [
                       'Start',
                       'End',
                       'Strand',
                       'Seq_id',
                       'Name',
                       'Score'
                       ],
                   'isArrayAttr' => {
                       }
                   },
	       "got right attributes"
               ) or diag explain $trackdata->{'trackData.jsonz'};

}

{
    my $snv_tempdir = tempdir();

    run_with (
        '--out' => $snv_tempdir,
        '--gff' => "tests/data/heterozygous_snv.gvf",
        '--trackLabel' => 'testSNV',
        '--key' => 'test SNV',
        '--type' => 'SNV',
        '--autocomplete' => 'all',
        '--cssClass' => 'transcript',
        );

    my $read_json = sub { slurp( $snv_tempdir, @_ ) };
    my $snv_trackdata = $read_json->(qw( tracks testSNV chr1 trackData.json ));

    is( $snv_trackdata->{featureCount}, 1, 'got right feature count' ) or diag explain $snv_trackdata;    
    is_deeply( $snv_trackdata->{'intervals'}->{'classes'}->[0]->{'attributes'}, 
	       ['Start', 'End',  'Strand', 'Source', 'Variant_reads2', 'Variant_seq', 'Seq_id', 'Variant_reads', 'Score', 'Genotype', 'Variant_seq2', 'Total_reads', 'Reference_seq', 'Type', 'Id'],  
	       'got right attributes in trackData.json for heterozygous SNV from GVF')  
	or diag explain $snv_trackdata->{'intervals'}->{'classes'}->[0]->{'attributes'};
    is_deeply( $snv_trackdata->{'intervals'}->{'nclist'}->[0],
	[0,  15882,   15883,  1,  'SOAPsnp',   16,  'G',  'chr1',  17,  36.5,  'heterozygous',  'C',  33,  'C',  'SNV',  'chr1:SOAP:SNV:15883'],
	"got right NClist for heterzygous SNV from GVF"
	) or diag explain $snv_trackdata->{'intervals'}->{'nclist'}->[0];
}

{
    my $snv_tempdir = tempdir();

    run_with (
        '--out' => $snv_tempdir,
        '--vcf' => "tests/data/heterozygous_snv.vcf",
        '--trackLabel' => 'testSNV',
        '--key' => 'test SNV',
        '--autocomplete' => 'all',
        );

    my $read_json = sub { slurp( $snv_tempdir, @_ ) };
    my $snv_trackdata = $read_json->(qw( tracks testSNV chr1 trackData.json ));
    is( $snv_trackdata->{intervals}->{nclist}->[0]->[1], 15882, 'start set correctly in json from VCF') or diag explain $snv_trackdata->{intervals}->{nclist}->[1];
    is( $snv_trackdata->{intervals}->{nclist}->[0]->[2], 15883, 'end set correctly in json from VCF') or diag explain $snv_trackdata->{intervals}->{nclist}->[2];
    is( $snv_trackdata->{intervals}->{minStart}, 15882, 'minStart set correctly in json from VCF') or diag explain $snv_trackdata->{intervals}->{minStart};
    is( $snv_trackdata->{intervals}->{maxEnd}, 15883, 'maxEnd set correctly in json from VCF') or diag explain $snv_trackdata->{intervals}->{maxEnd};
    is( $snv_trackdata->{intervals}->{nclist}->[0]->[10], "SNV", 'should set type as SNV in json from VCF') or diag explain $snv_trackdata->{nclist}->[0]->[10];
}

done_testing;
