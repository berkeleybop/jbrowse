/* 
   DasFeatureTrack ==> DraggableFeatureTrack ==> FeatureTrack ==> Track
   most of the previous differences between DAS tracks and DraggableFeatureTracks have 
      been refactored and pushed down into DraggableFeatureTrack or FeatureTrack
      only remaining difference is suppression of switch to histogram rendering 
      when zoomed out -- DAS feature loading does not yet support histogram summaries

   Unique Identity, DAS features, and NCLists:
      The NCLists used in DAS tracks do not strictly meet the full requirements 
      for nested containment lists.  In particular, the same DAS feature can be in 
      two (or more) different NCList containers (whereas in a strict nested containment 
      list each feature could only be in one container)

      Standard JBrowse features aren't guaranteed to have a unique id/name field, but are 
          each feature is guaranteed to have a unique path through the NCLists to that feature.  
          Therefore unique IDs are generated for JBrowse features based on the features path 
          in the NCLists.
          But can't do this for DAS features because two different NCList paths could lead to 
          the same feature.  However DAS features _are_ guaranteed to have a unique id
          Therefore instead of NCList path, DAS features use the DAS feature id for determining uniqueness
      Code for this is now pushed down into FeatureTrack.getId(), and unique id field is 
          indicated for a DAS track (or other tracks with unique ids for each features) in 
          the trackData.json with the "uniqueIdField" setting
 */

function DasFeatureTrack(trackMeta, url, refSeq, browserParams) {
    DraggableFeatureTrack.call(this, trackMeta, url, refSeq, browserParams);
}

DasFeatureTrack.prototype = new DraggableFeatureTrack();

DasFeatureTrack.prototype.fillBlock = function(blockIndex, block,
                                            leftBlock, rightBlock,
                                            leftBase, rightBase,
                                             scale, stripeWidth, 
					     containerStart, containerEnd) {
  // Histogram not yet re-implemented
  this.fillFeatures(blockIndex, block, leftBlock, rightBlock,
                    leftBase, rightBase, scale, 
		    containerStart, containerEnd);
};

/*
 DasFeatureTrack.prototype.getId = function(feature, path)  {
    var fid = this.fields["id"];
    return feature[fid];
};
*/

/*
Copyright (c) 2007-2010 The Evolutionary Software Foundation & BerkeleyBOP
Created by Mitchell Skinner <mitch_skinner@berkeley.edu>
    and Gregg Helt <gregghelt@gmail.com

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.
*/
