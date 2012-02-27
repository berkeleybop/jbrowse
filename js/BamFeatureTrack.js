/* 
   BamFeatureTrack ==> DraggableFeatureTrack ==> FeatureTrack ==> Track

   Differences in BamFeatureTrack
         suppression of histogram -- when zoomed out too far, instead show as grayed out?
         loading is different 
                there's no trackData.js, so override load() / loadSuccess() to bootstrap
                   so bootstrapping of NCList-ish struct, setting of sublistIndex, lazyFeatIndex etc
            rough equivalent of loading trackData.js might be loading .bam header, and .bai index file ?? 
 

   Unique Identity, BAM features, and NCLists:
      The NCLists used in BAM tracks do not strictly meet the full requirements 
      for nested containment lists.  In particular, the same BAM feature can be in 
      two (or more) different NCList containers (whereas in a strict nested containment 
      list each feature could only be in one container)

      Standard JBrowse features aren't guaranteed to have a unique id/name field, but  
          each feature is guaranteed to have a unique path through the NCLists to that feature.  
          Therefore unique IDs are generated for JBrowse features based on the features path 
          in the NCLists.
          But can't do this for BAM features because two different NCList paths could lead to 
          the same feature.  
          However BAM features _are_ guaranteed to have a unique id ???
          NEED TO ENSURE BAM FEATURES HAVE UNIQUE IDS ???  
               RNAME closest to an id, but read pairs can have same RNAME
                    so (RNAME + POS) ??   should be unique?
          Therefore instead of NCList path, BAM features use ??? for determining uniqueness
      Code for this is now pushed down into FeatureTrack.getId(), and unique id field is 
          indicated for a BAM track (or other tracks with unique ids for each feature) in 
          the trackData.json with the "uniqueIdField" setting
 */

function BamFeatureTrack(trackMeta, url, refSeq, browserParams) {
    DraggableFeatureTrack.call(this, trackMeta, url, refSeq, browserParams);
    this.glyphHeightPad = 0;
    this.levelHeightPad = 1;
}

BamFeatureTrack.prototype = new DraggableFeatureTrack();

BamFeatureTrack.prototype.load = function(bamurl, trackMeta)  {
    console.log("called BamFeatureTrack.load(), bam url: " + bamurl);
    var bamfetch = new URLFetchable(bamurl);
    var baifetch = new URLFetchable(trackMeta.index_url);
    console.log("built bam and bai URLFetchables");
    var curTrack = this;
    makeBam(bamfetch, baifetch, function(bamfile) {    // makeBam from dalliance/js/bam.js
		curTrack.loadSuccess(bamfile);
	    } );  
    // equivalent??: makeBam(bamfetch, baifetch, curTrack.loadSuccess);
    console.log("makeBam called");
}

BamFeatureTrack.prototype.loadSuccess = function(bamfile)  { 
    this.bamfile = bamfile;   // bamfile is a BamFile from dalliance/js/bam.js, 
    // this.trackMeta is set in FeatureTrack.beforeLoad()
    var trackInfo = this.trackMeta;

    console.log("BamFile created, header and index set up");
    // now set up rest of fields normally populated in loadSuccess via load of trackData.js
    this.fields = BamUtils.fields;
    this.subFields = BamUtils.subFields;  

    // possibly eventually do this by splitting feature based on skips in cigar string
    // this.subFields = BamUtils.subFields;
    // no url / basurl / importbaseurl needed, since BamFile already has url data for bam/bai access
    
    // now initialize BamPseudoNCList  
//    this.features = new BamPseudoNCList();
    this.features = new BamPseudoNCList(bamfile, this.refSeq);
//    this.features.importExisting(bam, sublistIndex, lazyIndex)

    // don't need subfeatureAray
    // don't ned histScale (not doing histograms yet)
    // need dummy labelScale, though no labels to show
    this.labelScale = 100; // in pixels/bp, so will never get scale > labelScale since max scale is CHAR_WIDTH pixels/bp
    // need dummy subfeatureScale, though no subfeats yet (but plan to have eventually based on CIGAR splitting)
    this.subfeatureScale = 0.01 // will attempt to show subfeatures if scale > subfeaturescale (if bp/pixel is < 100) (pixels/bp > 0.01) )
    
    this.className = "bam";
    // this.renderClassName = ???  // not using render class different than className yet
    this.subfeatureClasses = BamUtils.subfeatureClasses;  // NOT NEEDED until have subfeats based on CIGAR
//    this.arrowheadClass =  "trellis-arrowhead",
    this.arrowheadClass =  null;  // trying no arrowheads for now
    // this.urlTemplate = trackInfo.urlTemplate;  // NOT NEEDED
    // this.histogramMeta = trackInfo.histogramMeta;  // NOT NEEDED

    // ignoring histogram setup code, since not doing histograms yet
    //   same for histStats, histBinBases

    // ignoring trackMeta.clientConfig for now
    
    this.setLoaded();
    console.log("finished BamFeatureTrack.loadSuccess()");
}

BamFeatureTrack.prototype.fillBlock = function(blockIndex, block,
                                            leftBlock, rightBlock,
                                            leftBase, rightBase,
                                             scale, stripeWidth, 
					     containerStart, containerEnd) {

  // TODO: below a certain resolution ( < bp/pixel, or > scale), want to blank out blocks, 
  //   with some indicator that must zoom in to see BAM features
//  similar to fillHistogram, but graying out whole blocks insteal of filling with hist summary divs
//        need to make sure this triggers height adjustment (similar to how fillHistogram does? )
    //     so add histScale back in loadSuccess()?

  // Histogram not yet re-implemented
  this.fillFeatures(blockIndex, block, leftBlock, rightBlock,
                    leftBase, rightBase, scale, 
		    containerStart, containerEnd);
};

/*
 BamFeatureTrack.prototype.calcLevelHeight = function(scale)  {
//    return this.glyphHeight;
    return this.glyphHeight;
};
*/

BamFeatureTrack.prototype.getId = function(feature, path)  {
    var id = feature.uid;
    if (!id)  { 
	id = feature[BamUtils.ID] + "/" + feature[BamUtils.START] + "-" + feature[BamUtils.END];
	if (id) { feature.uid = id; }
    }
    return id;
}

/*
 BamFeatureTrack.prototype.getId = function(feature, path)  {
    var fid = this.fields["id"];
    return feature[fid];
};
*/

/*
Copyright (c) 2011 BerkeleyBOP
Created by Gregg Helt <gregghelt@gmail.com>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.
*/
