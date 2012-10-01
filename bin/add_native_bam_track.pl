#!/usr/bin/perl

use strict;
use warnings;

use FindBin qw($Bin);
use lib "$Bin/../lib";
use JBlibs;

use Getopt::Long qw(:config no_ignore_case bundling);
use IO::File;
use File::Basename;
use JSON;

my $in_file = "data/trackList.json";
my $out_file = "data/trackList.json";
my $label;
my $data_url;
my $index_url;
my $key;
my $classname = "bam";

parse_options();
add_native_bam_track();

sub parse_options {
	my $help;
	GetOptions("in|i=s"		=> \$in_file,
		   "out|o=s"		=> \$out_file,
		   "label|l=s"		=> \$label,
		   "data_url|u=s"	=> \$data_url,
		   "index_url|U=s"	=> \$index_url,
		   "key|k=s"		=> \$key,
		   "classname|c=s"	=> \$classname,
		   "help|h"		=> \$help);
	print_usage() if $help;
	die "Missing label option\n" if !$label;
	die "Missing data_url option\n" if !$data_url;
	die "Missing index_url option\n" if !$index_url;
	$key = $label if !$key;
}

sub print_usage {
	my $progname = basename($0);
	die << "END";
usage: $progname
	[-i|--in <input_trackList.json>]
	[-o|--out <output_trackList.json>]
	-l|--label <track_label>
	-u|--data_url <url_to_bam_file>
	-U|--index_url <url_to_bai_file>
	[-k|--key <track_key>]
	[-c|--classname <css_class>]
	[-h|--help]

	i: input trackList.json file [default: data/trackList.json]
	o: output trackList.json file [default: data/trackList.json]
	u: URL to BAM file (can be a relative path)
	U: URL to BAI (BAM index) file (can be a relative path)
	k: key (display name) for track [default: label value]
	c: CSS class for display [default: bam]
END
}

sub add_native_bam_track {
	my $json = new JSON;
	local $/;
	my $in;
	$in = new IO::File($in_file) or
		die "Error reading input $in_file: $!";
	my $track_list_contents = <$in>;
	my $track_list = $json->decode($track_list_contents);
	my $bam_entry;
	foreach my $track (@{$track_list->{tracks}}) {
		if ($track->{label} eq $label) {
			$bam_entry = $track;
		}
	}
	if (!$bam_entry) {
		$bam_entry = generate_new_bam_entry();
		push @{$track_list->{tracks}}, $bam_entry;
	};
	$bam_entry->{label} = $label;
	$bam_entry->{data_url} = $data_url;
	$bam_entry->{index_url} = $index_url;
	$bam_entry->{config}->{key} = $key;
	my $out;
	$out = new IO::File($out_file, "w") or
		die "Error writing output $out_file: $!";
	print $out $json->pretty->encode($track_list);
}

sub generate_new_bam_entry {
	return {
		type		=> "BamFeatureTrack",
		sourceUrl	=> "data/",
		config 	=> {
			autocomplete	=> "none",
			compress	=> 0,
			type		=> 1,
			subfeature	=> 1,
			style 	=> {
				className 		=> $classname,
				arrowheadClass 		=> "null",
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
		}
	}
}
