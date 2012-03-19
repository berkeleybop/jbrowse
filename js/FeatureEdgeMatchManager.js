
function FeatureEdgeMatchManager(selectionManager) {
  // console.log("FeatureEdgeMatchManager constructor called");
  this.featSelectionManager = DraggableFeatureTrack.selectionManager;
  this.annotSelectionManager = AnnotTrack.annotSelectionManager;
  this.featSelectionManager.addListener(this);
  this.annotSelectionManager.addListener(this);
  this.verbose_edges = false;
}

FeatureEdgeMatchManager.singleton = new FeatureEdgeMatchManager();
FeatureEdgeMatchManager.SHOW_EDGE_MATCHES = true;

/**
 *  since FeatureEdgeMatcher singleton is listening to both feature selection manager 
 *    and annot selectino manager, one of the manager clearing a selectino does not 
 *    mean the other selection is cleared
 *  so in edge-matcher selectionCleared(), after removing edge-match styling, rechecking 
 *    selections and redoing styles for any remaining selections
 */
FeatureEdgeMatchManager.prototype.selectionCleared = function(selected)  {
    if (FeatureEdgeMatchManager.SHOW_EDGE_MATCHES)  {
	$(".left-edge-match").removeClass("left-edge-match");
	$(".right-edge-match").removeClass("right-edge-match");
	var fselected = this.featSelectionManager.getSelection();
	for (var i = 0; i < fselected.length; ++i) {
//	for (var i in fselected)  {
	    var selfeat = fselected[i];
	    this.selectionAdded(selfeat);
	}
	var aselected = this.annotSelectionManager.getSelection();
//	for (var i in aselected)  {
	for (var i = 0; i < aselected.length; ++i) {
	    var selannot = aselected[i];
	    this.selectionAdded(selannot);
	}
    }
};

FeatureEdgeMatchManager.prototype.selectionRemoved = function(feat)  {
  // for now, brute force it -- remove all edge-match styling, 
  //    then re-add current selections one at a time
  //
  //  since selectionCleared is now redoing selections after clearing styles, 
  //      selectionRemoved() and selectionCleared() are now equivalent operations
    if (FeatureEdgeMatchManager.SHOW_EDGE_MATCHES)  {
	this.selectionCleared();
    }
};

// feat may be a feature or subfeature?
// experimenting with highlighting edges of features that match selected features (or their subfeatures) 
// still assuming index 0 for start, index 1 for end
// assumes all tracks have two-level features, and thus track.fields and track.subFields are populated
FeatureEdgeMatchManager.prototype.selectionAdded = function(feat)  {
    if (! FeatureEdgeMatchManager.SHOW_EDGE_MATCHES)  { return; }
    var source_feat = feat;
    var verbose_edges = this.verbose_edges;
    if (verbose_edges)  { console.log("EdgeMatcher.selectionAdded called"); }
    var source_track = source_feat.track;
    // var source_fields = source_track.fields;
    // var source_subfields = source_track.subFields;
    var source_attrs = source_track.attrs;


    var source_subfeats = source_attrs.get(source_feat, "Subfeatures");
    if (! source_subfeats) {
	source_subfeats = [ source_feat ];
    }
/*
    var source_subfeats = null;
    if (source_feat.parent)  {  // selection is a subfeature
	source_subfeats = [ source_feat ]; 
    }
    else if (!source_subfields)  { // track features don't have subfeatures
	source_subfeats = [ source_feat ];
	source_subfields = source_fields;
	// WARNING!  currently assumes min/max fields are same index in track.fields and track.subFields
    }
    else if (source_subfields && source_fields["subfeatures"])  { 
	source_subfeats = source_feat[source_fields["subfeatures"]];
    }
    else { // no way of munging subfeatures, so give up
	return;    
    }
*/
    if (verbose_edges) {  console.dir(source_subfeats); }

    var sourceid = source_feat.uid; 
    
    var qmin = source_attrs.get(source_feat, "Start");
    var qmax = source_attrs.get(source_feat, "End");
    // var smindex = source_attrs.get(source_subfields["start"];
    // var smaxdex = source_subfields["end"]; 

    if (verbose_edges)  { console.log("qmin = " + qmin + ", qmax = " + qmax); }
    
    var ftracks = $("div.track").each( function(index, trackdiv)  {  
        var target_track = trackdiv.track;
				   
//	if (target_track && target_track.features)  {
// TEMPORARY FIX for error when dragging track into main view --
//     if something selected, edge matching attempted on new track, which throws an error:
//             "target_subfields is undefined"
//             at "var tmindex = target_subfields["start"];" line below
//     error possibly due to track's trackData not yet being fully loaded, so check track load field
         if (target_track && target_track.features && target_track.loaded)  {
	     var target_attrs = target_track.attrs;				   
	    if (verbose_edges)  { console.log("edge matching for: " + target_track.name); console.log(trackdiv); }
	    var nclist = target_track.features;
	     
	    // var target_fields = target_track.fields;
	    // var target_subfields = target_track.subFields;
	   //  var tmindex = target_subfields["start"];
	   //  var tmaxdex = target_subfields["end"];

	    // only look at features that overlap source_feat min/max
	    // NCList.iterate only calls function for features that overlap qmin/qmax coords
	    nclist.iterate(qmin, qmax, function(target_feat, path) {
		if (verbose_edges)  {  console.log("checking feature: "); console.log(target_feat); }
		var target_subfeats = target_attrs.get(target_feat, "Subfeatures");
                if (! target_subfeats) {
		    target_subfeats = [ target_feat ];
		}
		if (verbose_edges)  { console.log(target_subfeats); }

		if (source_subfeats instanceof Array && 
		    target_subfeats instanceof Array && target_subfeats[0] instanceof Array)  {
		    var tid = target_feat.uid;
		    if (verbose_edges)  {  console.log("found overlap"); console.log(target_feat); }
		    if (tid)  {  
			var tdiv = target_track.getFeatDiv(target_feat);
			if (verbose_edges)  { console.log(tdiv); }
			if (tdiv)  {  // only keep going if target feature.uid already populated
			    // console.log(rsubdivs);
			    for (var i in source_subfeats)  {
				var ssfeat = source_subfeats[i];
				var ssmin = source_attrs.get(ssfeat, "Start");
				var ssmax = source_attrs.get(ssfeat, "End");
				for (var j in target_subfeats)  {
				    var tsfeat = target_subfeats[j];
				    var tsmin = target_attrs.get(tsfeat, "Start");
				    var tsmax = target_attrs.get(tsfeat, "End");
				    if (ssmin === tsmin || ssmax === tsmax)  {
					var tsid = tsfeat.uid;
					if (tsid)   {
					    var tsubdiv = target_track.getFeatDiv(tsfeat);
					    if (tsubdiv)  {
						var $tsubdiv = $(tsubdiv);
						if (ssmin === tsmin)  {
						    $(tsubdiv).addClass("left-edge-match");
						}
						if (ssmax === tsmax)  {
						    $(tsubdiv).addClass("right-edge-match");
						}

					    }
					}
				    }

				}
			    } 
			}
		    } 
		}
	    }, function() {} );  // empty function for no-op on finishing
	}
    } );
};






