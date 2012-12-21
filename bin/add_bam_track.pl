#!/usr/bin/env perl

use strict;
use warnings;

use Getopt::Long qw(:config no_ignore_case bundling);
use IO::File;
use File::Basename;
use JSON;

my $STORE_CLASS = "JBrowse/Store/SeqFeature/BAM";
my $ALIGNMENT_TYPE = "WebApollo/View/Track/DraggableAlignments";
my $COVERAGE_TYPE = "JBrowse/View/Track/FeatureCoverage";

my $in_file = "data/trackList.json";
my $out_file = "data/trackList.json";
my $label;
my $bam_url;
my $key;
my $classname = "bam";
my $mismatches = 0;
my $coverage = 0;
my $min_score = undef;
my $max_score = undef;

parse_options();
add_bam_track();

sub parse_options {
	my $help;
	GetOptions("in|i=s"		=> \$in_file,
		   "out|o=s"		=> \$out_file,
		   "label|l=s"		=> \$label,
		   "bam_url|u=s"	=> \$bam_url,
		   "key|k=s"		=> \$key,
		   "classname|c=s"	=> \$classname,
		   "mismatches|m"	=> \$mismatches,
		   "coverage|C"		=> \$coverage,
		   "min_score|s=i"	=> \$min_score,
		   "max_score|S=i"	=> \$max_score,
		   "help|h"		=> \$help);
	print_usage() if $help;
	die "Missing label option\n" if !$label;
	die "Missing bam_url option\n" if !$bam_url;
	die "Missing min_score option\n" if ($coverage && !defined $min_score);
	die "Missing max_score option\n" if ($coverage && !defined $max_score);
	$key = $label if !$key;
}

sub print_usage {
	my $progname = basename($0);
	die << "END";
usage: $progname
	[-i|--in <input_trackList.json>]
	[-o|--out <output_trackList.json>]
	-l|--label <track_label>
	-u|--bam_url <url_to_bam_file>
	[-k|--key <track_key>]
	[-c|--classname <css_class>]
	[-m|--mismatches]
	[-C|--coverage]
	[-s|--min_score <min_score>]
	[-S|--max_score <max_score>]
	[-h|--help]

	i: input trackList.json file [default: data/trackList.json]
	o: output trackList.json file [default: data/trackList.json]
	u: URL to BAM file (can be a relative path)
	k: key (display name) for track [default: label value]
	c: CSS class for display [default: bam]
	m: display mismatches in alignment (generates no subfeatures)
	C: display coverage data instead of alignments
	s: minimum score to use for generating coverage plot (only applicable
	   to when the -C option is chosen)
	S: maximum score to use for generating coverage plot (only applicable
	   to when the -C option is chosen)
END
}

sub add_bam_track {
	my $json = new JSON;
	local $/;
	my $in;
	$in = new IO::File($in_file) or
		die "Error reading input $in_file: $!";
	my $track_list_contents = <$in>;
	$in->close();
	my $track_list = $json->decode($track_list_contents);
	my $bam_entry;
	my $index;
	my $tracks = $track_list->{tracks};
	for ($index = 0; $index < scalar(@{$tracks}); ++$index) {
		my $track = $tracks->[$index];
		if ($track->{label} eq $label) {
			$bam_entry = $track;
			last;
		}
	}
	if (!$bam_entry) {
		$bam_entry = !$coverage ? generate_new_bam_alignment_entry() :
				generate_new_bam_coverage_entry();
		push @{$track_list->{tracks}}, $bam_entry;
	}
	else {
		if ($coverage) {
			if ($bam_entry->{type} eq $ALIGNMENT_TYPE) {
				$bam_entry = generate_new_bam_coverage_entry();
				$tracks->[$index] = $bam_entry;
			}
		}
		else {
			if ($bam_entry->{type} eq $COVERAGE_TYPE) {
				$bam_entry = generate_new_bam_alignment_entry();
				$tracks->[$index] = $bam_entry;
			}
		}
	}
	$bam_entry->{label} = $label;
	$bam_entry->{urlTemplate} = $bam_url;
	$bam_entry->{key} = $key;
	if (!$coverage) {
		$bam_entry->{subfeatures} = $mismatches ?
			JSON::false : JSON::true;
		$bam_entry->{style}->{className} = $classname;
		$bam_entry->{style}->{showSubfeatures} = $mismatches ?
			JSON::false : JSON::true;
		$bam_entry->{style}->{showMismatches} = $mismatches ?
			JSON::true : JSON::false;
	}
	else {
		$bam_entry->{min_score} = $min_score;
		$bam_entry->{max_score} = $max_score;
	}
	my $out;
	$out = new IO::File($out_file, "w") or
		die "Error writing output $out_file: $!";
	print $out $json->pretty->encode($track_list);
	$out->close();
}

sub generate_new_bam_alignment_entry {
	return {
		storeClass	=> $STORE_CLASS,
		type		=> $ALIGNMENT_TYPE,
		style	 	=> {
			arrowheadClass 		=> JSON::null,
			featureScale		=> 0.5,
			labelScale		=> 100,
			subfeatureClasses 	=> {
				"M" => "cigarM",
				"D" => "cigarD",
				"N" => "cigarN",
				"=" => "cigarEQ",
				"E" => "cigarEQ",
				"X" => "cigarX",
				"I" => "cigarI"
			}
		}
	};
}

sub generate_new_bam_coverage_entry {
	return {
		storeClass	=> $STORE_CLASS,
		type		=> $COVERAGE_TYPE
	};
}
