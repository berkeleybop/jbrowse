#!/usr/bin/env perl

use strict;
use warnings;

use Getopt::Long qw(:config no_ignore_case bundling);
use IO::File;
use File::Basename;
use JSON;

my $STORE_CLASS = "JBrowse/Store/BigWig";
my $HEATMAP_TYPE = "JBrowse/View/Track/Wiggle/Density";
my $PLOT_TYPE =  "JBrowse/View/Track/Wiggle/XYPlot";

my $in_file = "data/trackList.json";
my $out_file = "data/trackList.json";
my $label;
my $bw_url;
my $key;
my $plot = 0;
my $bicolor_pivot = "zero";
my $pos_color = undef;
my $neg_color = undef;
my $min_score = undef;
my $max_score = undef;

parse_options();
add_bw_track();

sub parse_options {
	my $help;
	GetOptions("in|i=s"		=> \$in_file,
		   "out|o=s"		=> \$out_file,
		   "label|l=s"		=> \$label,
		   "bw_url|u=s"		=> \$bw_url,
		   "key|k=s"		=> \$key, 
		   "plot|P"		=> \$plot,
		   "bicolor_pivot|b=s"	=> \$bicolor_pivot,
		   "pos_color|c=s"	=> \$pos_color,
		   "neg_color|C=s"	=> \$neg_color,
		   "min_score|s=i"	=> \$min_score,
		   "max_score|S=i"	=> \$max_score,
		   "help|h"		=> \$help);
	print_usage() if $help;
	die "Missing label option\n" if !$label;
	die "Missing bw_url option\n" if !$bw_url;
	$key = $label if !$key;
}

sub print_usage {
	my $progname = basename($0);
	die << "END";
usage: $progname
	[-i|--in <input_trackList.json>]
	[-o|--out <output_trackList.json>]
	-l|--label <track_label>
	-u|--bw_url <url_to_big_wig_file>
	[-k|--key <track_key>]
	[-P|--plot]
	[-b|bicolor_pivot <pivot_for_changing_colors>]
	[-c|pos_color <color_for_positive_side_of_pivot>]
	[-C|neg_color <color_for_negative_side_of_pivot>]
	[-s|min_score <min_score>]
	[-S|max_score <max_score>]
	[-h|--help]

	i: input trackList.json file [default: data/trackList.json]
	o: output trackList.json file [default: data/trackList.json]
	u: URL to BigWig file (can be a relative path)
	k: key (display name) for track [default: label value]
	b: point where to set pivot for color changes - can be "mean", "zero",
	   or a numeric value [default: mean]
	P: display as plot instead of density heatmap
	c: CSS color for positive side of pivot [default: blue]
	C: CSS color for negative side of pivot [default: red]
	s: mininum score to be graphed [default: autocalculated]
	S: maximum score to be graphed [default: autocalculated]
END
}

sub add_bw_track {
	my $json = new JSON;
	local $/;
	my $in;
	$in = new IO::File($in_file) or
		die "Error reading input $in_file: $!";
	my $track_list_contents = <$in>;
	$in->close();
	my $track_list = $json->decode($track_list_contents);
	my $bw_entry;

	my $index;
	my $tracks = $track_list->{tracks};
	for ($index = 0; $index < scalar(@{$tracks}); ++$index) {
		my $track = $tracks->[$index];
		if ($track->{label} eq $label) {
			$bw_entry = $track;
			last;
		}
	}

#	foreach my $track (@{$track_list->{tracks}}) {
#		if ($track->{label} eq $label) {
#			$bw_entry = $track;
#			last;
#		}
#	}
	if (!$bw_entry) {
		# $bw_entry = generate_new_bw_heatmap_entry();
		$bw_entry = !$plot ? generate_new_bw_heatmap_entry() :
				generate_new_bw_plot_entry();

		push @{$track_list->{tracks}}, $bw_entry;
	}
	else {
		if ($plot) {
			if ($bw_entry->{type} eq $HEATMAP_TYPE) {
				$bw_entry = generate_new_bw_plot_entry();
				$tracks->[$index] = $bw_entry;
			}
		}
		else {
			if ($bw_entry->{type} eq $PLOT_TYPE) {
				$bw_entry = generate_new_bw_heatmap_entry();
				$tracks->[$index] = $bw_entry;
			}
		}
	}

	$bw_entry->{label} = $label;
	$bw_entry->{urlTemplate} = $bw_url;
	$bw_entry->{key} = $key;
	$bw_entry->{bicolor_pivot} = $bicolor_pivot;
	if (defined $min_score) {
		$bw_entry->{min_score} = $min_score;
	}
	else {
		delete $bw_entry->{min_score};
	}
	if (defined $max_score) {
		$bw_entry->{max_score} = $max_score;
	}
	else {
		delete $bw_entry->{max_score};
	}
	if ($pos_color) {
		$bw_entry->{style}->{pos_color} = $pos_color;
	}
	else {
		delete $bw_entry->{style}->{pos_color};
	}
	if ($neg_color) {
		$bw_entry->{style}->{neg_color} = $neg_color;
	}
	else {
		delete $bw_entry->{style}->{neg_color};
	}
	delete $bw_entry->{style} if !scalar(keys %{$bw_entry->{style}});
	my $out;
	$out = new IO::File($out_file, "w") or
		die "Error writing output $out_file: $!";
	print $out $json->pretty->encode($track_list);
	$out->close();
}

sub generate_new_bw_heatmap_entry {
	return {
		storeClass	=> $STORE_CLASS, 
		type		=> $HEATMAP_TYPE
	};
}

sub generate_new_bw_plot_entry {
	return {
		storeClass	=> $STORE_CLASS, 
		type		=> $PLOT_TYPE
	};
}
