
function AnnotTrack(trackMeta, refSeq, browserParams) {
            //function AnnotTrack(trackMeta, url, refSeq, browserParams) {
    //trackMeta: object with:
    //            key:   display text track name
    //            label: internal track name (no spaces, odd characters)
    //            sourceUrl: replaces previous url arg to FetureTrack constructors
    //refSeq: object with:
    //         start: refseq start
    //         end:   refseq end
    //browserParams: object with:
    //                changeCallback: function to call once JSON is loaded
    //                trackPadding: distance in px between tracks
    //                baseUrl: base URL for the URL in trackMeta


    DraggableFeatureTrack.call(this, trackMeta, refSeq, browserParams);
    // this.selectionManager = this.setSelectionManager(new FeatureSelectionManager());
    // this.selectionManager = this.setSelectionManager(DraggableFeatureTrack.selectionManager);
    this.selectionManager = this.setSelectionManager(AnnotTrack.annotSelectionManager);
    //    this.selectionManager.setClearOnAdd(new Array(DraggableFeatureTrack.selectionManager));
    //    DraggableFeatureTrack.selectionManager.setClearOnAdd(new Array(this.selectionManager)); 

    this.selectionClass = "selected-annotation";
    this.annot_under_mouse = null;
    
    /** 
     * only show residues overlay if "pointer-events" CSS property is suppported
     *   (otherwise will interfere with passing of events to features beneath the overlay)
     */
    this.useResiduesOverlay = Modernizr.testProp('pointerEvents');
    this.FADEIN_RESIDUES = false;
    
    /**
     *   map keeping track of set of y positions for top-level feature divs of selected features
     *   (for better residue-overlay to be implemented TBD)
     */
//    this.selectionYPosition = null;

    var thisObj = this;
    /*
      this.subfeatureCallback = function(i, val, param) {
      thisObj.renderSubfeature(param.feature, param.featDiv, val);
      };
    */
    // define fields meta data
//    this.fields = AnnotTrack.fields;
    this.comet_working = true;
//     this.remote_edit_working = false;

    this.annotMouseDown = function(event)  {
	thisObj.onAnnotMouseDown(event);
    };

    this.verbose_create = false;
    this.verbose_add = false;
    this.verbose_delete = false;
    this.verbose_drop = false;
    this.verbose_click = false;
    this.verbose_resize = false;
    this.verbose_mousedown = false;
    this.verbose_mouseenter = false;
    this.verbose_mouseleave = false;
    this.verbose_render = false;
}

AnnotTrack.listeners = new Array();

// Inherit from DraggableFeatureTrack 
AnnotTrack.prototype = new DraggableFeatureTrack();

// annotSelectionManager is class variable (shared by all AnnotTrack instances)
AnnotTrack.annotSelectionManager = new FeatureSelectionManager();
// setting up selection exclusiveOr -- 
//    if selection is made in annot track, any selection in other tracks is deselected, and vice versa, 
//    regardless of multi-select mode etc.
AnnotTrack.annotSelectionManager.setClearOnAdd(new Array(DraggableFeatureTrack.selectionManager));
DraggableFeatureTrack.selectionManager.setClearOnAdd(new Array(AnnotTrack.annotSelectionManager));

/**
 *  only set USE_COMET true if server supports Servlet 3.0 comet-style long-polling, and web app is propertly set up for async
 *    otherwise if USE_COMET is set to true, will cause server-breaking errors
 *  
 */
AnnotTrack.USE_COMET = true;

/**
 *  set USE_LOCAL_EDITS = true to bypass editing calls to AnnotationEditorService servlet and attempt 
 *    to create similar annotations locally
 *  useful when AnnotationEditorService is having problems, or experimenting with something not yet completely implemented server-side
 */
AnnotTrack.USE_LOCAL_EDITS = false;

AnnotTrack.creation_count = 0;

// track.fields and track.subFields are set in FeatureTrack.loadSuccess() method, 
//      populated by "headers" and "subfeatureHeaders" fields in trackData.json data file
// annot_track.fields = {"start": 0, "end": 1, "strand": 2, "name": 3, "id":4, "subfeatures":5 };
// annot_track.subFields = {"start": 0, "end": 1, "strand": 2, "type": 3 };

dojo.require("dijit.Menu");
dojo.require("dijit.MenuItem");
dojo.require("dijit.Dialog");
var annot_context_menu;
var contextMenuItems;
var context_path = "/ApolloWeb";
// var context_path = "";

dojo.addOnLoad( function()  {  /* add dijit menu stuff here? */ } );

AnnotTrack.prototype.loadSuccess = function(trackInfo) {
    
    DraggableFeatureTrack.prototype.loadSuccess.call(this, trackInfo);
    
    var track = this;
    // for AnnotTrack, features currently MUST be an NCList
    var features = this.features;

    this.initContextMenu();
    this.initPopupDialog();
    
    if (! AnnotTrack.USE_LOCAL_EDITS)  {
	dojo.xhrPost( {
	    postData: '{ "track": "' + track.getUniqueTrackName() + '", "operation": "get_features" }',
	    url: context_path + "/AnnotationEditorService",
	    handleAs: "json",
	    timeout: 5 * 1000, // Time in milliseconds
	    // The LOAD function will be called on a successful response.
	    load: function(response, ioArgs) { //
		var responseFeatures = response.features;
		for (var i = 0; i < responseFeatures.length; i++) {
		    // var jfeat = JSONUtils.createJBrowseFeature(responseFeatures[i], track.fields, track.subFields);
		    var jfeat = JSONUtils.createJBrowseFeature(track.attrs, responseFeatures[i]);
		    features.add(jfeat, responseFeatures[i].uniquename);
		    // console.log("responseFeatures[0].uniquename: " + responseFeatures[0].uniquename);
		}
		track.hideAll();
		track.changed();
		//		features.verbose = true;  // turn on diagnostics reporting for track's NCList
		features.verbose = false;  // turn on diagnostics reporting for track's NCList
	    },
	    // The ERROR function will be called in an error case.
	    error: function(response, ioArgs) { //
		console.log("Annotation server error--maybe you forgot to login to the server?");
		console.error("HTTP status code: ", ioArgs.xhr.status); //
	    	track.handleError(response);
		//dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work'; //
		// track.remote_edit_working = false;
		return response; //
	    }
	});
    }
    
    if (AnnotTrack.USE_COMET)  {
	this.createAnnotationChangeListener();
    }
    this.makeTrackDroppable();
};

AnnotTrack.prototype.createAnnotationChangeListener = function() {
    var track = this;
    var features = this.features;
    
    if (AnnotTrack.listeners[track.getUniqueTrackName()]) {
    	if (AnnotTrack.listeners[track.getUniqueTrackName()].fired == -1) {
    		AnnotTrack.listeners[track.getUniqueTrackName()].cancel();
    	}
    }
    
    var listener = dojo.xhrGet( {
	url: context_path + "/AnnotationChangeNotificationService",
	content: {
	    track: track.getUniqueTrackName()
	},
	handleAs: "json",
//	timeout: 1000 * 1000, // Time in milliseconds
	timeout: 0,
	// The LOAD function will be called on a successful response.
	load: function(response, ioArgs) {
	    for (var i in response) {
		var changeData = response[i];
		if (changeData.operation == "ADD") {
		    console.log("ADD command from server: ");
		    console.log(changeData);
		    track.addFeatures(changeData.features);
		}
		else if (changeData.operation == "DELETE") {
		    console.log("DELETE command from server: ");
		    console.log(changeData);
		    track.deleteFeatures(changeData.features);
		}
		else if (changeData.operation == "UPDATE") {
		    console.log("UPDATE command from server: ");
		    console.log(changeData);
		    track.deleteFeatures(changeData.features);
		    track.addFeatures(changeData.features);
		}
		else  {
		    console.log("UNKNOWN command from server: ");
		    console.log(response);
		}
	    }
	    track.hideAll();
	    track.changed();
	    track.createAnnotationChangeListener();
	},
	// The ERROR function will be called in an error case.
	error: function(response, ioArgs) { //
		if (response.dojoType == "cancel") {
			return;
		}
		track.handleError(response);
	    console.error("HTTP status code: ", ioArgs.xhr.status); //
	    track.comet_working = false;
	    return response;
	},
	failOk: true
    });
    AnnotTrack.listeners[track.getUniqueTrackName()] = listener;

};

AnnotTrack.prototype.addFeatures = function(responseFeatures) {
	for (var i = 0; i < responseFeatures.length; ++i) {
//	    var featureArray = JSONUtils.createJBrowseFeature(responseFeatures[i], this.fields, this.subFields);
	    var featureArray = JSONUtils.createJBrowseFeature(this.attrs, responseFeatures[i]);
	    var id = responseFeatures[i].uniquename;
	   // if (this.features.featIdMap[id] == null) {
	   if (! this.features.contains(id))  {
		// note that proper handling of subfeatures requires annotation trackData.json resource to
		//    set sublistIndex one past last feature array index used by other fields
		//    (currently Annotations always have 6 fields (0-5), so sublistIndex = 6
		this.features.add(featureArray, id);
	    }
	}

};

AnnotTrack.prototype.deleteFeatures = function(responseFeatures) {
    for (var i = 0; i < responseFeatures.length; ++i) {
	var id_to_delete = responseFeatures[i].uniquename;
	this.features.deleteEntry(id_to_delete);
    }
};


/**
 *  overriding renderFeature to add event handling right-click context menu
 */
AnnotTrack.prototype.renderFeature = function(feature, uniqueId, block, scale,
					      containerStart, containerEnd) {
    //  if (uniqueId.length > 20)  {
    //    feature.short_id = uniqueId;
    //  }
    var track = this;
    var featDiv = DraggableFeatureTrack.prototype.renderFeature.call(this, feature, uniqueId, block, scale,
								     containerStart, containerEnd);

    if (featDiv && featDiv != null)  {
	annot_context_menu.bindDomNode(featDiv);
	$(featDiv).droppable(  {
	    accept: ".selected-feature",   // only accept draggables that are selected feature divs	
	    tolerance: "pointer", 
	    hoverClass: "annot-drop-hover", 
	    over: function(event, ui)  {
		track.annot_under_mouse = event.target;
	    }, 
	    out: function(event, ui)  {
		track.annot_under_mouse = null;
	    }, 
	    drop: function(event, ui)  {
		// ideally in the drop() on annot div is where would handle adding feature(s) to annot, 
		//   but JQueryUI droppable doesn't actually call drop unless draggable helper div is actually 
		//   over the droppable -- even if tolerance is set to pointer
		//      tolerance=pointer will trigger hover styling when over droppable, 
		//           as well as call to over method (and out when leave droppable)
		//      BUT location of pointer still does not influence actual dropping and drop() call
		// therefore getting around this by handling hover styling here based on pointer over annot, 
		//      but drop-to-add part is handled by whole-track droppable, and uses annot_under_mouse 
		//      tracking variable to determine if drop was actually on top of an annot instead of 
		//      track whitespace
		if (track.verbose_drop)  {
		    console.log("dropped feature on annot:");
		    console.log(featDiv);
		}
	    }
	    
	} );
    }
    return featDiv;
};

AnnotTrack.prototype.renderSubfeature = function(feature, featDiv, subfeature,
						 displayStart, displayEnd, block) {
    var subdiv = DraggableFeatureTrack.prototype.renderSubfeature.call(this, feature, featDiv, subfeature, 
								       displayStart, displayEnd, block);
    /**
     *  setting up annotation resizing via pulling of left/right edges
     */
    if (subdiv && subdiv != null)  {
	$(subdiv).bind("mousedown", this.annotMouseDown);
    }
    return subdiv;
};

/** 
 *  get the GenomeView's sequence track -- maybe move this to GenomeView?  
 *  WebApollo assumes there is only one SequenceTrack
 *     if there are multiple SequenceTracks, getSequenceTrack returns first one found
 *         iterating through tracks list
 */
AnnotTrack.prototype.getSequenceTrack = function()  {
    if (this.seqTrack)  {
	 return this.seqTrack;
    }
    else  {
	var tracks = this.gview.tracks;
	for (var i = 0; i < tracks.length; i++)  {
	    if (tracks[i] instanceof SequenceTrack)  {
		this.seqTrack = tracks[i];
		break;
	    }
	}
	return this.seqTrack;
    }
}

AnnotTrack.prototype.fillBlock = function(blockIndex, block, leftBlock, rightBlock, 
					 leftBase, rightBase, scale, stripeWidth, 
					 containerStart, containerEnd)  {
    DraggableFeatureTrack.prototype.fillBlock.call(this, 
						   blockIndex, block, leftBlock, rightBlock, 
						   leftBase, rightBase, scale, stripeWidth, 
						   containerStart, containerEnd);
/*
    var middle = (containerStart + containerEnd) / 2;
    var report = ((leftBase <= middle) && (rightBase > middle));
    if (report)  {
      console.log("AnnotTrack.fillBlock() called,  blockIndex: %f, leftBase: %f, rightBase: %f, scale: %f, "
		+ "stripeWidth: %f, containerStart: %f, containerEnd: %f, middle: %f", 
		blockIndex, leftBase, rightBase, scale, stripeWidth, containerStart, containerEnd, middle);
    }

    // what about removing any previous seqNodes from block, or check for existence and avoid creating 
    //   new SeqNodes if already exist???
    // looks like this is probably not necessary -- if fillBlock is called, block is either newly created 
    //     or previous children have been removed?
    var track = this;
    if (scale === track.browserParams.charWidth && track.useResiduesOverlay)  {
	var selected = track.selectionManager.getSelection();
	if (selected.length > 0)  {
 	    // get toplevel parent of selected feat
	    var topfeat = selected[0];
//	    if (report) {
//		console.log("feat: "); console.log(topfeat);
//		console.log("featdiv: "); console.log(track.getFeatDiv(topfeat));
//	    }
	    while (topfeat.parent)  {  
		topfeat = topfeat.parent;
	    }
	    if (report)  { console.log("topfeat: "); console.log(topfeat); }
	    var featdiv = track.getFeatDiv(topfeat);
	    if (report)  { console.log("topfeat featdiv: "); console.log(featdiv); }	    

//	    if (featdiv) { 
	    if (track.selectionYPosition)  {
		// need to float sequence residues over selected row(s)
		var seqTrack = this.getSequenceTrack();
		seqTrack.getRange(leftBase, rightBase, 
	           // see 
	           // callback, gets called for every chunk that overlaps with leftBase->rightBase range
	           //   start = genome coord of first bp of chunk
	           //   end = genome coord of last bp of chunk
	             function(start, end, seq) {
			 if (report) {
			     console.log("AnnotTrack blockIndex: %d, adding seq from %d to %d: %s", 
					 blockIndex, start, end, seq);
			 }
			 var seqNode = document.createElement("div");
			 seqNode.className = "annot-sequence";
			 seqNode.appendChild(document.createTextNode(seq));
			 // var ypos = $(topfeat).position().top; 
			 var ypos = track.selectionYPosition;
			 ypos += 2;  // hardwired adjustment to center (should be calc'd based on feature div dims?	    
			 // console.log("ypos: " + ypos);
			 seqNode.style.cssText = "top: " + ypos + "px;";
			 block.appendChild(seqNode);
			 $(seqNode).hide();
			 $(seqNode).fadeIn(1500);
		     }
                );
	    }
	}
    } 
    */
};


AnnotTrack.prototype.onFeatureMouseDown = function(event) {
    // _not_ calling DraggableFeatureTrack.prototyp.onFeatureMouseDown -- 
    //     don't want to allow dragging (at least not yet)
    // event.stopPropagation();
    this.last_mousedown_event = event;
    var ftrack = this;
    if (ftrack.verbose_selection || ftrack.verbose_drag)  { 
	console.log("AnnotTrack.onFeatureMouseDown called"); 
    }


    // checking for whether this is part of drag setup retrigger of mousedown -- 
    //     if so then don't do selection or re-setup draggability)
    //     this keeps selection from getting confused, 
    //     and keeps trigger(event) in draggable setup from causing infinite recursion 
    //     in event handling calls to featMouseDown
    if (ftrack.drag_create)  { 
	if (ftrack.verbose_selection || ftrack.verbose_drag)  {
	    console.log("DFT.featMouseDown re-triggered event for drag initiation, drag_create: " + ftrack.drag_create);
	    console.log(ftrack);
	}
	ftrack.drag_create = null;
    }
    else  {
	this.handleFeatureSelection(event);
	// this.handleFeatureDragSetup(event);
    }
};

/** 
 *   handles mouse down on an annotation
 *   to make the annotation resizable by pulling the left/right edges
 */
AnnotTrack.prototype.onAnnotMouseDown = function(event)  {
    var track = this;
//    track.last_mousedown_event = event;
    var verbose_resize = track.verbose_resize;
    if (verbose_resize || track.verbose_mousedown)  { console.log("AnnotTrack.onAnnotMouseDown called"); }
    event = event || window.event;
    var elem = (event.currentTarget || event.srcElement);
    var featdiv = DraggableFeatureTrack.prototype.getLowestFeatureDiv(elem);
    if (featdiv && (featdiv != null))  {
	if (dojo.hasClass(featdiv, "ui-resizable"))  {
	    if (verbose_resize)  {
		console.log("already resizable");
		console.log(featdiv);
	    }
	}
	else {
	    if (verbose_resize)  {
		console.log("making annotation resizable");
		console.log(featdiv);
	    }
	    $(featdiv).resizable( {
		handles: "e, w",
		helper: "ui-resizable-helper",
		autohide: false, 

		stop: function(event, ui)  {
		    if (verbose_resize) { 
			console.log("resizable.stop() called, event:");
			console.dir(event);
			console.log("ui:");
			console.dir(ui);
		    }
		    var gview = track.gview;
		    var oldPos = ui.originalPosition;
		    var newPos = ui.position;
		    var oldSize = ui.originalSize;
		    var newSize = ui.size;
		    var leftDeltaPixels = newPos.left - oldPos.left;
		    var leftDeltaBases = Math.round(gview.pxToBp(leftDeltaPixels));
		    var oldRightEdge = oldPos.left + oldSize.width;
		    var newRightEdge = newPos.left + newSize.width;
		    var rightDeltaPixels = newRightEdge - oldRightEdge;
		    var rightDeltaBases = Math.round(gview.pxToBp(rightDeltaPixels));
		    if (verbose_resize)  {
			console.log("left edge delta pixels: " + leftDeltaPixels);
			console.log("left edge delta bases: " + leftDeltaBases);
			console.log("right edge delta pixels: " + rightDeltaPixels);
			console.log("right edge delta bases: " + rightDeltaBases);
		    }
		    var subfeat = ui.originalElement[0].subfeature;
		    console.log(subfeat);

		    if (!AnnotTrack.USE_COMET || !track.comet_working) {
			track.attrs.set(subfeat, "Start", (track.attrs.get(subfeat, "Start") + leftDeltaBases));
			track.attrs.set(subfeat, "End", (track.attrs.get(subfeat, "End") + rightDeltaBases));
		    	// subfeat[track.subFields["start"]] += leftDeltaBases;
		    	// subfeat[track.subFields["end"]] += rightDeltaBases;
		    }
		    else {
			var fmin = track.attrs.get(subfeat, "Start") + leftDeltaBases;
			var fmax = track.attrs.get(subfeat, "End") + rightDeltaBases;
		    	// var fmin = subfeat[track.subFields["start"]] + leftDeltaBases;
		    	// var fmax = subfeat[track.subFields["end"]] + rightDeltaBases;
			dojo.xhrPost( {
			    postData: '{ "track": "' + track.getUniqueTrackName() + '", "features": [ { "uniquename": ' + subfeat.uid + ', "location": { "fmin": ' + fmin + ', "fmax": ' + fmax + ' } } ], "operation": "set_exon_boundaries" }',
			    url: context_path + "/AnnotationEditorService",
			    handleAs: "json",
			    timeout: 1000 * 1000, // Time in milliseconds
			    // The LOAD function will be called on a successful response.
			    load: function(response, ioArgs) { //
				if (!AnnotTrack.USE_COMET || !track.comet_working)  {
				    //TODO
				}
			    },
			    // The ERROR function will be called in an error case.
			    error: function(response, ioArgs) { //
				console.log("Error creating annotation--maybe you forgot to log into the server?");
				console.error("HTTP status code: ", ioArgs.xhr.status); //
				track.handleError(response);
				//dojo.byId("replace").innerHTML = 'Loading the ressource from the server did not work'; //
				return response;
			    }
			});
		    }
		    console.log(subfeat);
		    track.hideAll();
		    track.changed();
		}
	    } );
	    
	}
    }
    event.stopPropagation();
};


/**
 *  feature click no-op (to override FeatureTrack.onFeatureClick, which conflicts with mouse-down selection
 */
AnnotTrack.prototype.onFeatureClick = function(event) {
    if (this.verbose_click)  { console.log("in AnnotTrack.onFeatureClick"); }
    event = event || window.event;
    var elem = (event.currentTarget || event.srcElement);
    var featdiv = DraggableFeatureTrack.prototype.getLowestFeatureDiv(elem);
    if (featdiv && (featdiv != null))  {
	if (this.verbose_click)  { console.log(featdiv); }
    }
    // do nothing
    //   event.stopPropagation();
};

AnnotTrack.prototype.addToAnnotation = function(annot, feats_to_add)  {
	var target_track = this;
        var tatts = target_track.attrs;
	var nclist = target_track.features;

	if (AnnotTrack.USE_LOCAL_EDITS) {
		if (this.verbose_add)  {
			console.log("adding to annot: ");
			console.log(annot);
			// console.log("removing annotation for modification");
		}
		// removing annotation from NCList (since need to re-add after modifications for proper repositioning)
		// not necessary, track.hideAll() / track.changed() at end forces rerendering
		//  nclist.deleteEntry(annot.uid);

		// flatten features (only add subfeats)
		var subfeats = [];

		var flength = feats_to_add.length;
		for (var i=0; i<flength; i++)  { 
			var feat = feats_to_add[i];
			var is_subfeature = (!!feat.parent);  // !! is shorthand for returning true if value is defined and non-null
			if (is_subfeature)  {
				subfeats.push(feat);
			}
			else  {
				var source_track = feat.track;
			        var satts = source_track.attrs;
			        if (satts.hasDefinedAttribute(feat, "Subfeatures")) {
				// if (source_track.fields["subfeatures"])  {
					// var subs = feat[source_track.fields["subfeatures"]];
				        var subs = satts.get(feat, "Subfeatures");
					$.merge(subfeats, subs);
				}
			}
		}
		if (this.verbose_add)  {
			console.log("flattened feats to add");
			console.log(subfeats);
		}

		var slength = subfeats.length;
		for (var k=0; k<slength; k++)  {
			var sfeat = subfeats[k];
			if (this.verbose_add)  {
				console.log("converting feature, is_subfeature = " + is_subfeature + ":");
				console.log(sfeat);
			}
			var source_track = sfeat.track;
		        var satts = source_track.attrs;
			var newfeat = JSONUtils.convertToTrack(sfeat, source_track, target_track);
			var id = "annot_" + AnnotTrack.creation_count++;
			newfeat.parent = annot;
		        if (tatts.hasDefinedAttribute(newfeat, "Id"))  {
			    tatts.set(newfeat, "Id", id);
			}
		        if (tatts.hasDefinedAttribute(newfeat, "Name"))  {
			    tatts.set(newfeat, "Name", id);
			}
			newfeat.uid = id;
			newfeat.track = target_track;  // done in convertToTrack, but just making sure...
			if (this.verbose_add)  {
				console.log("converted feature created: ");
				console.log(newfeat);
			}
			// var annot_subs = annot[target_track.fields["subfeatures"]];
		        var annot_subs = tatts.get(annot, "Subfeatures");
			annot_subs.push(newfeat);
			// hardwiring start as f[0], end as f[1] for now -- 
			//   to fix this need to whether newfeat is a subfeat, etc.
			// if (newfeat[0] < annot[0])  {annot[0] = newfeat[0];}
			// if (newfeat[1] > annot[1])  {annot[1] = newfeat[1];}
		        if (tatts.get(newfeat, "Start") < tatts.get(annot, "Start")) {
			    tatts.set(annot, "Start", tatts.get(newfeat, "Start"));
			}
		        if (tatts.get(newfeat, "End") > tatts.get(annot, "End"))  {
			    tatts.set(annot, "End", tatts.get(newfeat, "End"));
			}
		}

		if (this.verbose_add)  {
			console.log("adding modified annotation back: ");
			console.log(annot.slice());
		}

		// adding modified annotation back to NCList 
		// no longer removing (relying on hideAll/changed calls), so don't need to add back
		//    nclist.add(annot, annot.uid);

		// force re-rendering
		this.hideAll();
		this.changed();
		if (this.verbose_add)  { console.log("finished adding to annot: "); }
	}
	else {
		var subfeats = new Array();
		for (var i = 0; i < feats_to_add.length; ++i)  { 
			var feat = feats_to_add[i];
			var isSubfeature = (!!feat.parent);  // !! is shorthand for returning true if value is defined and non-null
			if (isSubfeature)  {
				subfeats.push(feat);
			}
			else  {
				var source_track = feat.track;
				// if (source_track.fields["subfeatures"])  {
			        if (satts.hasDefinedAttribute(feat, "Subfeatures")) {
			            // var subs = feat[source_track.fields["subfeatures"]];
				    var subs = satts.get(feat, "Subfeatures");
				    $.merge(subfeats, subs);
				}
			}
		}
		
		var featuresString = "";
		for (var i = 0; i < subfeats.length; ++i) {
			var subfeat = subfeats[i];
			// if (subfeat[target_track.subFields["type"]] != "wholeCDS") {
		        if (tatts.get(subfeat, "Type") != "wholeCDS") {
				var jsonFeature = JSONUtils.createApolloFeature(tatts, subfeats[i], "exon");
				featuresString += ", " + JSON.stringify(jsonFeature);
			}
		}
//		var parent = JSONUtils.createApolloFeature(annot, target_track.fields, target_track.subfields);
//		parent.uniquename = annot[target_track.fields["name"]];
		dojo.xhrPost( {
			postData: '{ "track": "' + target_track.getUniqueTrackName() + '", "features": [ {"uniquename": "' + annot.uid + '"}' + featuresString + '], "operation": "add_exon" }',
			url: context_path + "/AnnotationEditorService",
			handleAs: "json",
			timeout: 5000, // Time in milliseconds
			// The LOAD function will be called on a successful response.
			load: function(response, ioArgs) { //
				if (!AnnotTrack.USE_COMET || !target_track.comet_working)  {
					//TODO
				}
			}
		});
	}
};

AnnotTrack.prototype.makeTrackDroppable = function() {
    var target_track = this;
    var target_trackdiv = target_track.div;
    if (target_track.verbose_drop)  {
	console.log("making track a droppable target: ");
	console.log(this);
	console.log(target_trackdiv);
    }
    $(target_trackdiv).droppable(  {
	// only accept draggables that are selected feature divs
	accept: ".selected-feature",   
	// switched to using deactivate() rather than drop() for drop handling
	// this fixes bug where drop targets within track (feature divs) were lighting up as drop target, 
	//    but dropping didn't actually call track.droppable.drop() 
	//    (see explanation in feature droppable for why we catch drop at track div rather than feature div child)
	//    cause is possible bug in JQuery droppable where droppable over(), drop() and hoverclass 
	//       collision calcs may be off (at least when tolerance=pointer)?
	// 
	// Update 3/2012
	// deactivate behavior changed?  Now getting called every time dragged features are release, 
	//     regardless of whether they are over this track or not
	// so added another hack to get around drop problem
	// combination of deactivate and keeping track via over()/out() of whether drag is above this track when released
	// really need to look into actual drop calc fix -- maybe fixed in new JQuery releases?
	//         
	// drop: function(event, ui)  { 
        over: function(event, ui) {
	    target_track.track_under_mouse_drag = true;
	}, 
	out: function(event, ui) {
	    target_track.track_under_mouse_drag = false;
	}, 
	deactivate: function(event, ui)  {	
	    // console.log("trackdiv droppable detected: draggable deactivated");
	    // "this" is the div being dropped on, so same as target_trackdiv
	    if (target_track.verbose_drop)  { console.log("draggable deactivated"); }

	    var dropped_feats = DraggableFeatureTrack.selectionManager.getSelection();
	    // problem with making individual annotations droppable, so checking for "drop" on annotation here, 
	    //    and if so re-routing to add to existing annotation
	    if (target_track.annot_under_mouse != null)  {
		if (target_track.verbose_drop)  {
		    console.log("draggable dropped onto annot: ");
		    console.log(target_track.annot_under_mouse.feature);
		}
		target_track.addToAnnotation(target_track.annot_under_mouse.feature, dropped_feats);
	    }
	    else if (target_track.track_under_mouse_drag) {
		if (target_track.verbose_drop)  { console.log("draggable dropped on AnnotTrack"); }
		target_track.createAnnotations(dropped_feats);
	    }
	    // making sure annot_under_mouse is cleared 
	    //   (should do this in the drop?  but need to make sure _not_ null when 
	    target_track.annot_under_mouse = null;
	    target_track.track_under_mouse_drag = false;
	}    
    } );
    if (target_track.verbose_drop) { console.log("finished making droppable target"); }
};

AnnotTrack.prototype.createAnnotations = function(feats)  {
	var target_track = this;
	var features_nclist = target_track.features;
	var featuresToAdd = new Array();
	for (var i in feats)  {
		var dragfeat = feats[i];
		var source_track = dragfeat.track;
		if (this.verbose_create)  {
			console.log("creating annotation based on feature: ");
			console.log(dragfeat);
		}
		var dragdiv = source_track.getFeatDiv(dragfeat);
		var is_subfeature = (!!dragfeat.parent);  // !! is shorthand for returning true if value is defined and non-null
		var newfeat = JSONUtils.convertToTrack(dragfeat, source_track, target_track);
		var source_fields = source_track.fields;
		var source_subFields = source_track.subFields;
		var target_fields = target_track.fields;
		var target_subFields = target_track.subFields;
		if (this.verbose_create)  {
			console.log("local feat conversion: " );
			console.log(newfeat);
		}
		var afeat = JSONUtils.createApolloFeature(source_track.attrs, dragfeat, "transcript");
		featuresToAdd.push(afeat);
	}
	// creating JSON feature data struct that WebApollo server understands, 
	//    based on JSON feature data struct that JBrowse understands
	var afeat = JSONUtils.createApolloFeature(source_track.attrs, dragfeat, "transcript");
	if (this.verbose_create)  {
		console.log("remote annotation creation");
		console.log("createApolloFeature: ");
		console.log(afeat);
	}

	dojo.xhrPost( {
		postData: '{ "track": "' + target_track.getUniqueTrackName() + '", "features": ' + JSON.stringify(featuresToAdd) + ', "operation": "add_transcript" }',
		url: context_path + "/AnnotationEditorService",
		handleAs: "json",
		timeout: 5000, // Time in milliseconds
		// The LOAD function will be called on a successful response.
		load: function(response, ioArgs) { //
			if (this.verbose_create)  { console.log("Successfully created annotation object: " + response); }
			// response processing is now handled by the long poll thread (when using servlet 3.0)
			//  if comet-style long pollling is not working, then create annotations based on 
			//     AnnotationEditorResponse
			if (!AnnotTrack.USE_COMET || !target_track.comet_working)  {
				responseFeatures = response.features;
				for (var rindex in responseFeatures)  {
					var rfeat = responseFeatures[rindex];
					if (this.verbose_create)  { console.log("AnnotationEditorService annot object: ");
					console.log(rfeat); }
					var jfeat = JSONUtils.createJBrowseFeature(target_track.attrs, rfeat);
					if (this.verbose_create)  { console.log("Converted annot object to JBrowse feature array: " + jfeat.uid);
					console.log(jfeat); }
					features_nclist.add(jfeat, jfeat.uid);
				} 
				target_track.hideAll();
				target_track.changed();
			}
		},
		// The ERROR function will be called in an error case.
		error: function(response, ioArgs) { //
			target_track.handleError(response);
			console.log("Error creating annotation--maybe you forgot to log into the server?");
			console.error("HTTP status code: ", ioArgs.xhr.status); //
			//dojo.byId("replace").innerHTML = 'Loading the ressource from the server did not work'; //
			return response;
		}
	});
};

/**
 *  If there are multiple AnnotTracks, each has a separate FeatureSelectionManager 
 *    (contrasted with DraggableFeatureTracks, which all share the same selection and selection manager
 */
AnnotTrack.prototype.deleteSelectedFeatures = function()  {
    var selected = this.selectionManager.getSelection();
    this.selectionManager.clearSelection();
    this.deleteAnnotations(selected);
};

AnnotTrack.prototype.deleteAnnotations = function(annots) {
    var track = this;
    var features_nclist = track.features;
    var features = '"features": [';
    var uniqueNames = [];
    for (var i in annots)  {
	var annot = annots[i];
	var uniqueName = annot.uid;
	// just checking to ensure that all features in selection are from this track -- 
	//   if not, then don't try and delete them
	if (annot.track === track)  {
	    var trackdiv = track.div;
	    var trackName = track.getUniqueTrackName();

	    if (i > 0) {
		features += ',';
	    }
	    features += ' { "uniquename": "' + uniqueName + '" } ';
	    uniqueNames.push(uniqueName);
	}
    }
    features += ']';
    if (this.verbose_delete)  {
	console.log("annotations to delete:");
	console.log(features);
    }

    if (AnnotTrack.USE_LOCAL_EDITS)  {
	// need to sort into top-level features (which need to get deleted from nclist) and non-top-level 
	//   (which need to get removed from their parent feature)
	for (var k in annots)  {
	    var annot = annots[k];
	    var id_to_delete = annot.uid;
	    if (this.verbose_delete)  { 
		console.log("trying to delete: " + id_to_delete); 
		console.log(annot);
		// console.dir(annot);
	    }
	    // console.log(features_nclist);
	    if (features_nclist.contains(id_to_delete))  {
		if (this.verbose_delete)  { console.log("found in nclist, calling nclist.deleteEntry()"); }
		features_nclist.deleteEntry(id_to_delete);
	    }
	    else  {
		if (this.verbose_delete)  { console.log("not found in nclist, trying to remove from parent: "); }
		var parent = annot.parent;
		if (this.verbose_delete)  { console.log(parent); }
		if (parent)  {
		    // var modparent = BioFeatureUtils.removeChild(annot);
		    var modparent = BioFeatureUtils.removeChild(annot);
		    if (this.verbose_delete)  { console.log(parent); }
		    if (modparent)  {  // child removed, removeChild returned parent 
			features_nclist.deleteEntry(parent.uid);
			features_nclist.add(parent, parent.uid);
		    }
		    else  {   // child removed, but removeChild returned null, indicating parent has no more children
			if (this.verbose_delete)  { console.log("no more children, so removing parent too"); }
			features_nclist.deleteEntry(parent.uid);
		    }
		}
	    }
	}
	if (this.verbose_delete)  { console.log("re-rendering track"); }
	track.hideAll();
	track.changed();
    }
    else {
	dojo.xhrPost( {
	    postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "delete_feature" }',
	    // postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "delete_exon" }',
	    url: context_path + "/AnnotationEditorService",
	    handleAs: "json",
	    timeout: 5000 * 1000, // Time in milliseconds
	    load: function(response, ioArgs) {
		if (!AnnotTrack.USE_COMET || !track.comet_working)  {
		    var responseFeatures = response.features;
		    if (!responseFeatures || responseFeatures.length == 0)  {
			// if not using comet, or comet not working
			// and no features are returned, then they were successfully deleted?
			for (var j in uniqueNames)  {
			    var id_to_delete = uniqueNames[j];
			    if (this.verbose_delete)  { console.log("server deleted: " + id_to_delete); }
			    features_nclist.deleteEntry(id_to_delete);
			}
			track.hideAll();
			track.changed();
		    }
		}
	    },
	    // The ERROR function will be called in an error case.
	    error: function(response, ioArgs) { // 
	    	track.handleError(response);
		console.log("Annotation server error--maybe you forgot to login to the server?");
		console.error("HTTP status code: ", ioArgs.xhr.status); //
		//dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work'; //  
		return response; // 
	    }
	    
	});
    }
};

AnnotTrack.prototype.mergeSelectedFeatures = function()  {
    var selected = this.selectionManager.getSelection();
    this.selectionManager.clearSelection();
    this.mergeAnnotations(selected);
};

AnnotTrack.prototype.mergeAnnotations = function(annots) {
    var track = this;
    
    var sortedAnnots = track.sortAnnotationsByLocation(annots);
    var leftAnnot = sortedAnnots[0];
    var rightAnnot = sortedAnnots[sortedAnnots.length - 1];
    var trackName = this.getUniqueTrackName();

    /*
    for (var i in annots)  {
        var annot = annots[i];
        // just checking to ensure that all features in selection are from this track -- 
        //   if not, then don't try and delete them
        if (annot.track === track)  {
            var trackName = track.getUniqueTrackName();
            if (leftAnnot == null || annot[track.fields["start"]] < leftAnnot[track.fields["start"]]) {
            	leftAnnot = annot;
            }
            if (rightAnnot == null || annot[track.fields["end"]] > rightAnnot[track.fields["end"]]) {
            	rightAnnot = annot;
            }
        }
    }
    */
    
    var features;
    var operation;
    // merge exons
    if (leftAnnot.parent && rightAnnot.parent && leftAnnot.parent == rightAnnot.parent) {
        features = '"features": [ { "uniquename": "' + leftAnnot.uid + '" }, { "uniquename": "' + rightAnnot.uid + '" } ]';
        operation = "merge_exons";
    }
    // merge transcripts
    else {
    	var leftTranscriptId = leftAnnot.parent ? leftAnnot.parent.uid : leftAnnot.uid;
    	var rightTranscriptId = rightAnnot.parent ? rightAnnot.parent.uid : rightAnnot.uid;
        features = '"features": [ { "uniquename": "' + leftTranscriptId + '" }, { "uniquename": "' + rightTranscriptId + '" } ]';
        operation = "merge_transcripts";
    }
    if (AnnotTrack.USE_LOCAL_EDITS)  {
        // TODO
        track.hideAll();
        track.changed();
    }
    else  {
    	dojo.xhrPost( {
    	    postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }',
    	    url: context_path + "/AnnotationEditorService",
    	    handleAs: "json",
    	    timeout: 5000 * 1000, // Time in milliseconds
    	    load: function(response, ioArgs) {
    		// TODO
    	    },
    	    // The ERROR function will be called in an error case.
    	    error: function(response, ioArgs) { // 
    		track.handleError(response);
    		console.log("Annotation server error--maybe you forgot to login to the server?");
    		console.error("HTTP status code: ", ioArgs.xhr.status); 
    		//
    		//dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work'; //  
    		return response; // 
    	    }

    	});
    }
};

AnnotTrack.prototype.splitSelectedFeatures = function(event)  {
    var selected = this.selectionManager.getSelection();
    this.selectionManager.clearSelection();
    this.splitAnnotations(selected, event);
};

AnnotTrack.prototype.splitAnnotations = function(annots, event) {
    // can only split on max two elements
    if (annots.length > 2) {
	return;
    }
    var track = this;
    var sortedAnnots = track.sortAnnotationsByLocation(annots);
    var leftAnnot = sortedAnnots[0];
    var rightAnnot = sortedAnnots[sortedAnnots.length - 1];
    var trackName = track.getUniqueTrackName();
    
    /*
    for (var i in annots)  {
        var annot = annots[i];
        // just checking to ensure that all features in selection are from this track -- 
        //   if not, then don't try and delete them
        if (annot.track === track)  {
            var trackName = track.getUniqueTrackName();
            if (leftAnnot == null || annot[track.fields["start"]] < leftAnnot[track.fields["start"]]) {
            	leftAnnot = annot;
            }
            if (rightAnnot == null || annot[track.fields["end"]] > rightAnnot[track.fields["end"]]) {
            	rightAnnot = annot;
            }
        }
    }
    */
    var features;
    var operation;
    // split exon
    if (leftAnnot == rightAnnot) {
    	var coordinate = this.gview.getGenomeCoord(event);
        features = '"features": [ { "uniquename": "' + leftAnnot.uid + '", "location": { "fmax": ' + (coordinate - 1) + ', "fmin": ' + (coordinate + 1) + ' } } ]';
        operation = "split_exon";
    }
    // split transcript
    else if (leftAnnot.parent == rightAnnot.parent) {
        features = '"features": [ { "uniquename": "' + leftAnnot.uid + '" }, { "uniquename": "' + rightAnnot.uid + '" } ]';
        operation = "split_transcript";
    }
    else {
    	return;
    }
    if (AnnotTrack.USE_LOCAL_EDITS)  {
        // TODO
        track.hideAll();
        track.changed();
    }
    else  {
    	dojo.xhrPost( {
    	    postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }',
    	    url: context_path + "/AnnotationEditorService",
    	    handleAs: "json",
    	    timeout: 5000 * 1000, // Time in milliseconds
    	    load: function(response, ioArgs) {
    		// TODO
    	    },
    	    // The ERROR function will be called in an error case.
    	    error: function(response, ioArgs) { // 
    			track.handleError(response);
    		console.log("Annotation server error--maybe you forgot to login to the server?");
    		console.error("HTTP status code: ", ioArgs.xhr.status); 
    		//
    		//dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work'; //  
    		return response; // 
    	    }

    	});
    }
};

AnnotTrack.prototype.makeIntron = function(event)  {
    var selected = this.selectionManager.getSelection();
    this.selectionManager.clearSelection();
    this.makeIntronInExon(selected, event);
};

AnnotTrack.prototype.makeIntronInExon = function(annots, event) {
    if (annots.length > 1) {
    	return;
    }
    var track = this;
    var annot = annots[0];
	var coordinate = this.gview.getGenomeCoord(event);
    var features = '"features": [ { "uniquename": "' + annot.uid + '", "location": { "fmin": ' + coordinate + ' } } ]';
    var operation = "make_intron";
    var trackName = track.getUniqueTrackName();
    if (AnnotTrack.USE_LOCAL_EDITS)  {
        // TODO
        track.hideAll();
        track.changed();
    }
    else  {
    	dojo.xhrPost( {
    	    postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }',
    	    url: context_path + "/AnnotationEditorService",
    	    handleAs: "json",
    	    timeout: 5000 * 1000, // Time in milliseconds
    	    load: function(response, ioArgs) {
    	    	// TODO
    	    },
    	    // The ERROR function will be called in an error case.
    	    error: function(response, ioArgs) { // 
    			track.handleError(response);
    	    	console.log("Annotation server error--maybe you forgot to login to the server?");
    	    	console.error("HTTP status code: ", ioArgs.xhr.status); 
    	    	//
    	    	//dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work'; //  
    	    	return response; // 
    	    }

    	});
    }
};

AnnotTrack.prototype.setTranslationStart = function(event)  {
    var selected = this.selectionManager.getSelection();
    this.selectionManager.clearSelection();
    this.setTranslationStartInCDS(selected, event);
};

AnnotTrack.prototype.setTranslationStartInCDS = function(annots, event) {
    if (annots.length > 1) {
    	return;
    }
    var track = this;
    var annot = annots[0];
	var coordinate = this.gview.getGenomeCoord(event);
	var uid = annot.parent ? annot.parent.uid : annot.uid;
    var features = '"features": [ { "uniquename": "' + uid + '", "location": { "fmin": ' + coordinate + ' } } ]';
    var operation = "set_translation_start";
    var trackName = track.getUniqueTrackName();
    if (AnnotTrack.USE_LOCAL_EDITS)  {
        // TODO
        track.hideAll();
        track.changed();
    }
    else  {
    	dojo.xhrPost( {
    	    postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }',
    	    url: context_path + "/AnnotationEditorService",
    	    handleAs: "json",
    	    timeout: 5000 * 1000, // Time in milliseconds
    	    load: function(response, ioArgs) {
    	    	// TODO
    	    },
    	    // The ERROR function will be called in an error case.
    	    error: function(response, ioArgs) { // 
    			track.handleError(response);
    	    	console.log("Annotation server error--maybe you forgot to login to the server?");
    	    	console.error("HTTP status code: ", ioArgs.xhr.status); 
    	    	//
    	    	//dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work'; //  
    	    	return response; // 
    	    }

    	});
    }
}

AnnotTrack.prototype.flipStrand = function()  {
    var selected = this.selectionManager.getSelection();
    this.flipStrandForSelectedFeatures(selected);
};

AnnotTrack.prototype.flipStrandForSelectedFeatures = function(annots) {
    var track = this;
    var uniqueNames = new Object();
    for (var i in annots)  {
    	var annot = annots[i];
    	// get top level feature
    	while (annot.parent) {
    		annot = annot.parent;
    	}
    	var uniqueName = annot.uid;
    	// just checking to ensure that all features in selection are from this track
    	if (annot.track === track)  {
    		uniqueNames[uniqueName] = 1;
    	}
    }
    var features = '"features": [';
    var i = 0;
    for (var uniqueName in uniqueNames) {
	    var trackdiv = track.div;
	    var trackName = track.getUniqueTrackName();

	    if (i > 0) {
	    	features += ',';
	    }
	    features += ' { "uniquename": "' + uniqueName + '" } ';
	    ++i;
    }
    features += ']';
    var operation = "flip_strand";
    var trackName = track.getUniqueTrackName();
    if (AnnotTrack.USE_LOCAL_EDITS)  {
        // TODO
        track.hideAll();
        track.changed();
    }
    else  {
    	dojo.xhrPost( {
    	    postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }',
    	    url: context_path + "/AnnotationEditorService",
    	    handleAs: "json",
    	    timeout: 5000 * 1000, // Time in milliseconds
    	    load: function(response, ioArgs) {
    	    },
    	    // The ERROR function will be called in an error case.
    	    error: function(response, ioArgs) { // 
    			track.handleError(response);
    	    	console.log("Annotation server error--maybe you forgot to login to the server?");
    	    	console.error("HTTP status code: ", ioArgs.xhr.status); 
    	    	//
    	    	//dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work'; //  
    	    	return response; // 
    	    }

    	});
    }
};

AnnotTrack.prototype.setLongestORF = function()  {
    var selected = this.selectionManager.getSelection();
    this.selectionManager.clearSelection();
    this.setLongestORFForSelectedFeatures(selected);
};

AnnotTrack.prototype.setLongestORFForSelectedFeatures = function(annots) {
    var track = this;
    var features = '"features": [';
    for (var i in annots)  {
    	var annot = annots[i];
    	// get top level feature
    	while (annot.parent) {
    		annot = annot.parent;
    	}
    	var uniqueName = annot.uid;
    	// just checking to ensure that all features in selection are from this track
    	if (annot.track === track)  {
    	    var trackdiv = track.div;
    	    var trackName = track.getUniqueTrackName();

    	    if (i > 0) {
    	    	features += ',';
    	    }
    	    features += ' { "uniquename": "' + uniqueName + '" } ';
    	}
    }
    features += ']';
    var operation = "set_longest_orf";
    var trackName = track.getUniqueTrackName();
	var information = "";
    if (AnnotTrack.USE_LOCAL_EDITS)  {
        // TODO
        track.hideAll();
        track.changed();
    }
    else  {
    	dojo.xhrPost( {
    	    postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }',
    	    url: context_path + "/AnnotationEditorService",
    	    handleAs: "json",
    	    timeout: 5000 * 1000, // Time in milliseconds
    	    load: function(response, ioArgs) {
    	    },
    	    // The ERROR function will be called in an error case.
    	    error: function(response, ioArgs) { // 
    			track.handleError(response);
    	    	console.log("Annotation server error--maybe you forgot to login to the server?");
    	    	console.error("HTTP status code: ", ioArgs.xhr.status); 
    	    	//
    	    	//dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work'; //  
    	    	return response; // 
    	    }

    	});
    }
}

AnnotTrack.prototype.undo = function()  {
    var selected = this.selectionManager.getSelection();
    this.selectionManager.clearSelection();
    this.undoSelectedFeatures(selected);
};

AnnotTrack.prototype.undoSelectedFeatures = function(annots) {
    var track = this;
    var features_nclist = track.features;
    var features = '"features": [';
    for (var i in annots)  {
    	var annot = annots[i];
    	// get top level feature
    	while (annot.parent) {
    		annot = annot.parent;
    	}
    	var uniqueName = annot.uid;
    	// just checking to ensure that all features in selection are from this track
    	if (annot.track === track)  {
    	    var trackdiv = track.div;
    	    var trackName = track.getUniqueTrackName();

    	    if (i > 0) {
    	    	features += ',';
    	    }
    	    features += ' { "uniquename": "' + uniqueName + '" } ';
    	}
    }
    features += ']';
    var operation = "undo";
    var trackName = track.getUniqueTrackName();
    if (AnnotTrack.USE_LOCAL_EDITS)  {
        // TODO
        track.hideAll();
        track.changed();
    }
    else  {
    	dojo.xhrPost( {
    	    postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }',
    	    url: context_path + "/AnnotationEditorService",
    	    handleAs: "json",
    	    timeout: 5000 * 1000, // Time in milliseconds
    	    load: function(response, ioArgs) {
    	    	if (response && response.confirm) {
    	    		if (track.handleConfirm(response.confirm)) {
        		    	dojo.xhrPost( {
        		    		sync: true,
        		    	    postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '", "confirm": true }',
        		    	    url: context_path + "/AnnotationEditorService",
        		    	    handleAs: "json",
        		    	    timeout: 5000 * 1000, // Time in milliseconds
        		    	    load: function(response, ioArgs) {
        		    	    	// TODO
        		    	    },
        		    	    error: function(response, ioArgs) { // 
        		    	    	track.handleError(response);
        		    	    	return response;
        		    	    }
        		    	});
    	    		}
    	    	}
    	    },
    	    // The ERROR function will be called in an error case.
    	    error: function(response, ioArgs) { // 
    	    	track.handleError(response);
    	    	return response;
    	    }

    	});
    }
};

AnnotTrack.prototype.redo = function()  {
    var selected = this.selectionManager.getSelection();
    this.selectionManager.clearSelection();
    this.redoSelectedFeatures(selected);
};

AnnotTrack.prototype.redoSelectedFeatures = function(annots) {
    var track = this;
    var features_nclist = track.features;
    var features = '"features": [';
    for (var i in annots)  {
    	var annot = annots[i];
    	// get top level feature
    	while (annot.parent) {
    		annot = annot.parent;
    	}
    	var uniqueName = annot.uid;
    	// just checking to ensure that all features in selection are from this track
    	if (annot.track === track)  {
    	    var trackdiv = track.div;
    	    var trackName = track.getUniqueTrackName();

    	    if (i > 0) {
    	    	features += ',';
    	    }
    	    features += ' { "uniquename": "' + uniqueName + '" } ';
    	}
    }
    features += ']';
    var operation = "redo";
    var trackName = track.getUniqueTrackName();
    if (AnnotTrack.USE_LOCAL_EDITS)  {
        // TODO
        track.hideAll();
        track.changed();
    }
    else  {
    	dojo.xhrPost( {
    	    postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }',
    	    url: context_path + "/AnnotationEditorService",
    	    handleAs: "json",
    	    timeout: 5000 * 1000, // Time in milliseconds
    	    load: function(response, ioArgs) {
    	    	// TODO
    	    },
    	    // The ERROR function will be called in an error case.
    	    error: function(response, ioArgs) { // 
    			track.handleError(response);
    	    	console.log("Annotation server error--maybe you forgot to login to the server?");
    	    	console.error("HTTP status code: ", ioArgs.xhr.status); 
    	    	//
    	    	//dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work'; //  
    	    	return response; // 
    	    }

    	});
    }
};

AnnotTrack.prototype.getInformation = function()  {
    var selected = this.selectionManager.getSelection();
    this.getInformationForSelectedFeatures(selected);
};

AnnotTrack.prototype.getInformationForSelectedFeatures = function(annots) {
    var track = this;
    var features = '"features": [';
    for (var i in annots)  {
    	var annot = annots[i];
    	// get top level feature
    	while (annot.parent) {
    		annot = annot.parent;
    	}
    	var uniqueName = annot.uid;
    	// just checking to ensure that all features in selection are from this track
    	if (annot.track === track)  {
    	    var trackdiv = track.div;
    	    var trackName = track.getUniqueTrackName();

    	    if (i > 0) {
    	    	features += ',';
    	    }
    	    features += ' { "uniquename": "' + uniqueName + '" } ';
    	}
    }
    features += ']';
    var operation = "get_information";
    var trackName = track.getUniqueTrackName();
	var information = "";
    if (AnnotTrack.USE_LOCAL_EDITS)  {
        // TODO
        track.hideAll();
        track.changed();
    }
    else  {
    	dojo.xhrPost( {
    	    postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }',
    	    url: context_path + "/AnnotationEditorService",
    	    handleAs: "json",
    	    timeout: 5000 * 1000, // Time in milliseconds
    	    load: function(response, ioArgs) {
    	    	for (var i = 0; i < response.features.length; ++i) {
    	    		var feature = response.features[i];
    	    		if (i > 0) {
    	    			information += "<hr/>";
    	    		}
    	    		information += "Uniquename: " + feature.uniquename + "<br/>";
    	    		information += "Date of creation: " + feature.time_accessioned + "<br/>";
    	    		information += "Owner: " + feature.owner + "<br/>";
    	    		information += "Parent ids: " + feature.parent_ids + "<br/>";
    	    	}
    	    	track.openDialog("Feature information", information);
    	    },
    	    // The ERROR function will be called in an error case.
    	    error: function(response, ioArgs) { // 
    			track.handleError(response);
    	    	console.log("Annotation server error--maybe you forgot to login to the server?");
    	    	console.error("HTTP status code: ", ioArgs.xhr.status); 
    	    	//
    	    	//dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work'; //  
    	    	return response; // 
    	    }

    	});
    }
};

AnnotTrack.prototype.getSequence = function()  {
    var selected = this.selectionManager.getSelection();
    this.getSequenceForSelectedFeatures(selected);
};

AnnotTrack.prototype.getSequenceForSelectedFeatures = function(annots) {
	var track = this;

	var content = dojo.create("div");
	var textArea = dojo.create("textarea", { class: "sequence_area", readonly: true }, content);
	var form = dojo.create("form", { }, content);
	var peptideButtonDiv = dojo.create("div", { class: "first_button_div" }, form);
	var peptideButton = dojo.create("input", { type: "radio", name: "type", checked: true }, peptideButtonDiv);
	var peptideButtonLabel = dojo.create("label", { innerHTML: "Peptide sequence", class: "button_label" }, peptideButtonDiv);
	var cdnaButtonDiv = dojo.create("div", { class: "button_div" }, form);
	var cdnaButton = dojo.create("input", { type: "radio", name: "type" }, cdnaButtonDiv);
	var cdnaButtonLabel = dojo.create("label", { innerHTML: "cDNA sequence", class: "button_label" }, cdnaButtonDiv);
	var cdsButtonDiv = dojo.create("div", { class: "button_div" }, form);
	var cdsButton = dojo.create("input", { type: "radio", name: "type" }, cdsButtonDiv);
	var cdsButtonLabel = dojo.create("label", { innerHTML: "CDS sequence", class: "button_label" }, cdsButtonDiv);
	var genomicButtonDiv = dojo.create("div", { class: "button_div" }, form);
	var genomicButton = dojo.create("input", { type: "radio", name: "type" }, genomicButtonDiv);
	var genomicButtonLabel = dojo.create("label", { innerHTML: "Genomic sequence", class: "button_label" }, genomicButtonDiv);
	var genomicWithFlankButtonDiv = dojo.create("div", { class: "button_div" }, form);
	var genomicWithFlankButton = dojo.create("input", { type: "radio", name: "type" }, genomicWithFlankButtonDiv);
	var genomicWithFlankButtonLabel = dojo.create("label", { innerHTML: "Genomic sequence +/-", class: "button_label" }, genomicWithFlankButtonDiv);
	var genomicWithFlankField = dojo.create("input", { type: "text", size: 5, class: "button_field", value: "500" }, genomicWithFlankButtonDiv);
	var genomicWithFlankFieldLabel = dojo.create("label", { innerHTML: "bases", class: "button_label" }, genomicWithFlankButtonDiv);

	var fetchSequence = function(type) {
	    var features = '"features": [';
	    for (var i = 0; i < annots.length; ++i)  {
	    	var annot = annots[i];
	    	var uniqueName = annot.uid;
	    	// just checking to ensure that all features in selection are from this track
	    	if (annot.track === track)  {
	    	    var trackdiv = track.div;
	    	    var trackName = track.getUniqueTrackName();

	    	    if (i > 0) {
	    	    	features += ',';
	    	    }
	    	    features += ' { "uniquename": "' + uniqueName + '" } ';
	    	}
	    }
	    features += ']';
	    var operation = "get_sequence";
	    var trackName = track.getUniqueTrackName();
	    if (AnnotTrack.USE_LOCAL_EDITS)  {
	        // TODO
	        track.hideAll();
	        track.changed();
	    }
	    else  {
	    	var postData = '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '"';
	    	var flank = 0;
	    	if (type == "genomic_with_flank") {
	    		flank = dojo.attr(genomicWithFlankField, "value");
	    		postData += ', "flank": ' + flank;
	    		type = "genomic";
	    	}
	    	postData += ', "type": "' + type + '" }';
	    	dojo.xhrPost( {
	    	    postData: postData,
	    	    url: context_path + "/AnnotationEditorService",
	    	    handleAs: "json",
	    	    timeout: 5000 * 1000, // Time in milliseconds
	    	    load: function(response, ioArgs) {
	    	    	var textAreaContent = "";
	    	    	for (var i = 0; i < response.features.length; ++i) {
	    	    		var feature = response.features[i];
	    	    		var cvterm = feature.type;
	    	    		var residues = feature.residues;
	    	    		textAreaContent += "&gt;" + feature.uniquename + " (" + cvterm.cv.name + ":" + cvterm.name + ") " + residues.length + " residues [" + type + (flank > 0 ? " +/- " + flank + " bases" : "") + "]\n";
	    	    		var lineLength = 70;
	    	    		for (var j = 0; j < residues.length; j += lineLength) {
	    	    			textAreaContent += residues.substr(j, lineLength) + "\n";
	    	    		}
	    	    	}
	    	    	dojo.attr(textArea, "innerHTML", textAreaContent);
	    	    },
	    	    // The ERROR function will be called in an error case.
	    	    error: function(response, ioArgs) { // 
	    			track.handleError(response);
	    	    	console.log("Annotation server error--maybe you forgot to login to the server?");
	    	    	console.error("HTTP status code: ", ioArgs.xhr.status); 
	    	    	//
	    	    	//dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work'; //  
	    	    	return response; // 
	    	    }

	    	});
	    }


	};
	
	var callback = function(event) {
		var type;
		var target = event.target || event.srcElement;
		if (target == peptideButton || target == peptideButtonLabel) {
			dojo.attr(peptideButton, "checked", true);
			type = "peptide";
		}
		else if (target == cdnaButton || target == cdnaButtonLabel) {
			dojo.attr(cdnaButton, "checked", true);
			type = "cdna";
		}
		else if (target == cdsButton || target == cdsButtonLabel) {
			dojo.attr(cdsButton, "checked", true);
			type = "cds";
		}
		else if (target == genomicButton || target == genomicButtonLabel) {
			dojo.attr(genomicButton, "checked", true);
			type = "genomic";
		}
		else if (target == genomicWithFlankButton || target == genomicWithFlankButtonLabel) {
			dojo.attr(genomicWithFlankButton, "checked", true);
			type = "genomic_with_flank";
		}
		fetchSequence(type);
	};
	
	dojo.connect(peptideButton, "onchange", null, callback);
	dojo.connect(peptideButtonLabel, "onclick", null, callback);
	dojo.connect(cdnaButton, "onchange", null, callback);
	dojo.connect(cdnaButtonLabel, "onclick", null, callback);
	dojo.connect(cdsButton, "onchange", null, callback);
	dojo.connect(cdsButtonLabel, "onclick", null, callback);
	dojo.connect(genomicButton, "onchange", null, callback);
	dojo.connect(genomicButtonLabel, "onclick", null, callback);
	dojo.connect(genomicWithFlankButton, "onchange", null, callback);
	dojo.connect(genomicWithFlankButtonLabel, "onclick", null, callback);
	
	fetchSequence("peptide");
	this.openDialog("Sequence", content);
};

AnnotTrack.prototype.zoomToBaseLevel = function(event) {
	var coordinate = this.gview.getGenomeCoord(event);
	this.gview.zoomToBaseLevel(event, coordinate);
};

AnnotTrack.prototype.zoomBackOut = function(event) {
	this.gview.zoomBackOut(event);
}

AnnotTrack.prototype.createAnnotation = function()  {

};

// AnnotTrack.prototype.addToAnnotation


// AnnotTrack.prototype.deleteFromAnnotation = function()  { }
// handle potential effect on parent?
AnnotTrack.prototype.deleteAnnotation = function()  {

};

AnnotTrack.prototype.changeAnnotationLocation = function()  {

};

AnnotTrack.prototype.handleError = function(response) {
	console.log("ERROR: ");
	console.log(response);  // in Firebug, allows retrieval of stack trace, jump to code, etc.
	var error = eval('(' + response.responseText + ')');
	if (error.error) {
		alert(error.error);
		return false;
	}
};

AnnotTrack.prototype.handleConfirm = function(response) {
	return confirm(response);
};

AnnotTrack.prototype.initContextMenu = function() {

    var thisObj = this;
    
    contextMenuItems = new Array();
    annot_context_menu = new dijit.Menu({});
	dojo.xhrPost( {
		sync: true,
		postData: '{ "track": "' + thisObj.getUniqueTrackName() + '", "operation": "get_user_permission" }',
		url: context_path + "/AnnotationEditorService",
		handleAs: "json",
		timeout: 5 * 1000, // Time in milliseconds
		// The LOAD function will be called on a successful response.
		load: function(response, ioArgs) { //
			var permission = response.permission;
			thisObj.permission = permission;
			var index = 0;
			if (permission & Permission.WRITE) {
				annot_context_menu.addChild(new dijit.MenuItem( {
					label: "Delete",
					onClick: function() {
						thisObj.deleteSelectedFeatures();
					}
				} ));
				contextMenuItems["delete"] = index++;
				annot_context_menu.addChild(new dijit.MenuItem( {
					label: "Merge",
					onClick: function() {
						thisObj.mergeSelectedFeatures();
					}
				} ));
				contextMenuItems["merge"] = index++;
				annot_context_menu.addChild(new dijit.MenuItem( {
					label: "Split",
					onClick: function(event) {
						// use annot_context_mousedown instead of current event, since want to split 
						//    at mouse position of event that triggered annot_context_menu popup
						thisObj.splitSelectedFeatures(thisObj.annot_context_mousedown);
					}
				} ));
				contextMenuItems["split"] = index++;
				annot_context_menu.addChild(new dijit.MenuItem( {
					label: "Make intron",
					// use annot_context_mousedown instead of current event, since want to split 
					//    at mouse position of event that triggered annot_context_menu popup
					onClick: function(event) {
						thisObj.makeIntron(thisObj.annot_context_mousedown);
					}
				} ));
				contextMenuItems["make_intron"] = index++;
				annot_context_menu.addChild(new dijit.MenuItem( {
					label: "Set translation start",
					// use annot_context_mousedown instead of current event, since want to split 
					//    at mouse position of event that triggered annot_context_menu popup
					onClick: function(event) {
						if (thisObj.getMenuItem("set_translation_start").get("label") == "Set translation start") {
							thisObj.setTranslationStart(thisObj.annot_context_mousedown);
						}
						else {
							thisObj.setLongestORF();
						}
					}
				} ));
				contextMenuItems["set_translation_start"] = index++;
				annot_context_menu.addChild(new dijit.MenuItem( {
					label: "Flip strand",
					onClick: function(event) {
						thisObj.flipStrand();
					}
				} ));
				contextMenuItems["flip_strand"] = index++;
				annot_context_menu.addChild(new dijit.MenuItem( {
					label: "Undo",
					onClick: function(event) {
						thisObj.undo();
					}
				} ));
				contextMenuItems["undo"] = index++;
				annot_context_menu.addChild(new dijit.MenuItem( {
					label: "Redo",
					onClick: function(event) {
						thisObj.redo();
					}
				} ));
				contextMenuItems["redo"] = index++;
			}
			annot_context_menu.addChild(new dijit.MenuItem( {
				label: "Information",
				onClick: function(event) {
					thisObj.getInformation();
				}
			} ));
			contextMenuItems["information"] = index++;
			annot_context_menu.addChild(new dijit.MenuItem( {
				label: "Get sequence",
				onClick: function(event) {
					thisObj.getSequence();
				}
			} ));
			contextMenuItems["get_sequence"] = index++;
			annot_context_menu.addChild(new dijit.MenuItem( {
				label: "Zoom to base level",
				onClick: function(event) {
					if (thisObj.getMenuItem("zoom_to_base_level").get("label") == "Zoom to base level") {
						thisObj.zoomToBaseLevel(thisObj.annot_context_mousedown);
					}
					else {
						thisObj.zoomBackOut(thisObj.annot_context_mousedown);
					}
				}
			} ));
			contextMenuItems["zoom_to_base_level"] = index++;
			annot_context_menu.addChild(new dijit.MenuItem( {
				label: "..."
			} ));
		},
		// The ERROR function will be called in an error case.
		error: function(response, ioArgs) { //
//		    thisObj.handleError(response);
		}
	});

	annot_context_menu.onOpen = function(event) {
		// keeping track of mousedown event that triggered annot_context_menu popup, 
		//   because need mouse position of that event for some actions
		thisObj.annot_context_mousedown = thisObj.last_mousedown_event;
		if (thisObj.permission & Permission.WRITE) {
			thisObj.updateMenu();
		}
	};
	
    annot_context_menu.startup();
};

AnnotTrack.prototype.initPopupDialog = function() {
	var track = this;
	var id = "popup_dialog";

	// deregister widget (needed if changing refseq without reloading page)
	var widget = dijit.registry.byId(id);
	if (widget) {
		widget.destroy();
	}
	track.popupDialog = new dijit.Dialog({
		preventCache: true,
		id: id
	});
	dojo.connect(track.popupDialog, "onHide", null, function() {
		track.selectionManager.clearSelection();
	});
	track.popupDialog.startup();

};

AnnotTrack.prototype.getUniqueTrackName = function() {
	return this.name + "-" + this.refSeq.name;
};

AnnotTrack.prototype.openDialog = function(title, data) {
	this.popupDialog.set("title", title);
	this.popupDialog.set("content", data);
    this.popupDialog.show();
    this.popupDialog.placeAt("GenomeBrowser", "first");
};

AnnotTrack.prototype.updateMenu = function() {
	this.updateSetTranslationStartMenuItem();
	this.updateMergeMenuItem();
	this.updateSplitMenuItem();
	this.updateMakeIntronMenuItem();
	this.updateFlipStrandMenuItem();
	this.updateUndoMenuItem();
	this.updateRedoMenuItem();
	this.updateZoomToBaseLevelMenuItem();
};

AnnotTrack.prototype.updateSetTranslationStartMenuItem = function() {
	var menuItem = this.getMenuItem("set_translation_start");
    var selected = this.selectionManager.getSelection();
    if (selected.length > 1) {
    	menuItem.set("disabled", true);
    	return;
    }
    menuItem.set("disabled", false);
    var selectedFeat = selected[0];
    if (selectedFeat.parent) {
    	selectedFeat = selectedFeat.parent;
    }
    if (selectedFeat.manuallySetTranslationStart) {
    	menuItem.set("label", "Unset translation start");
    }
    else {
    	menuItem.set("label", "Set translation start");
    }
};

AnnotTrack.prototype.updateMergeMenuItem = function() {
	var menuItem = this.getMenuItem("merge");
    var selected = this.selectionManager.getSelection();
    if (selected.length < 2) {
    	menuItem.set("disabled", true);
    	return;
    }
    var strand = this.getStrand(selected[0]);
    for (var i = 1; i < selected.length; ++i) {
    	if (this.getStrand(selected[i]) != strand) {
        	menuItem.set("disabled", true);
        	return;
    	}
    }
	menuItem.set("disabled", false);
};

AnnotTrack.prototype.updateSplitMenuItem = function() {
	var menuItem = this.getMenuItem("split");
    var selected = this.selectionManager.getSelection();
    if (selected.length > 2) {
    	menuItem.set("disabled", true);
    	return;
    }
    var parent = selected[0].parent;
    for (var i = 1; i < selected.length; ++i) {
    	if (selected[i].parent != parent) {
        	menuItem.set("disabled", true);
        	return;
    	}
    }
	menuItem.set("disabled", false);
};

AnnotTrack.prototype.updateMakeIntronMenuItem = function() {
	var menuItem = this.getMenuItem("make_intron");
    var selected = this.selectionManager.getSelection();
    if (selected.length > 1) {
    	menuItem.set("disabled", true);
    	return;
    }
    menuItem.set("disabled", false);
};

AnnotTrack.prototype.updateFlipStrandMenuItem = function() {
	var menuItem = this.getMenuItem("flip_strand");
};

AnnotTrack.prototype.updateUndoMenuItem = function() {
	var menuItem = this.getMenuItem("undo");
    var selected = this.selectionManager.getSelection();
    if (selected.length > 1) {
    	menuItem.set("disabled", true);
    	return;
    }
    menuItem.set("disabled", false);
};

AnnotTrack.prototype.updateRedoMenuItem = function() {
	var menuItem = this.getMenuItem("redo");
    var selected = this.selectionManager.getSelection();
    if (selected.length > 1) {
    	menuItem.set("disabled", true);
    	return;
    }
    menuItem.set("disabled", false);
};

AnnotTrack.prototype.updateZoomToBaseLevelMenuItem = function() {
	var menuItem = this.getMenuItem("zoom_to_base_level");
	if (!this.gview.isZoomedToBase()) {
		menuItem.set("label", "Zoom to base level");
	}
	else {
		menuItem.set("label", "Zoom back out");
	}
};

AnnotTrack.prototype.getMenuItem = function(operation) {
	return annot_context_menu.getChildren()[contextMenuItems[operation]];
};

AnnotTrack.prototype.getStrand = function(feature) {
//	if (feature.parent) {
//		return feature[this.subFields["strand"]];
//	}
//	return feature[this.fields["strand"]];
    return this.attrs.get(feature, "Strand");
};

AnnotTrack.prototype.sortAnnotationsByLocation = function(annots) {
	var track = this;
        var atts = track.attrs;
	return annots.sort(function(annot1, annot2) {
	    var start1 = atts.get(annot1, "Start");
            var end1 = atts.get(annot1, "End");
	    var start2 = atts.get(annot2, "Start");
            var end2 = atts.get(annot2, "End");

            if (start1 != start2)  { return start1 - start2; }
	    else if (end1 != end2) { return end1 - end2; }
            else { return 0; }
/*
     	if (annot1[track.fields["start"]] != annot2[track.fields["start"]]) {
    		return annot1[track.fields["start"]] - annot2[track.fields["start"]];
    	}
    	if (annot1[track.fields["end"]] != annot2[track.fields["end"]]) {
    		return annot1[track.fields["end"]] - annot2[track.fields["end"]];
    	}
    	return 0;
*/
    });
};

AnnotTrack.prototype.showRange = function(first, last, startBase, bpPerBlock, scale,
					  containerStart, containerEnd) {
    // console.log("called AnnotTrack.showRange()");
    DraggableFeatureTrack.prototype.showRange.call(this, first, last, startBase, bpPerBlock, scale,
						   containerStart, containerEnd);
    //    console.log("after calling annot track.showRange(), block range: " + 
    //		this.firstAttached + "--" + this.lastAttached + ",  " + (this.lastAttached - this.firstAttached));

    // handle showing base residues for selected here?
    // selected feats 
    //   ==> selected feat divs 
    //            ==> selected "rows" 
    //                  ==> (A) float SequenceTrack-like residues layer (with blocks) on each selected row?
    //                   OR (B) just get all residues needed and float simple div (no blocks)
    //                            but set up so that callback for actual render happens once all needed residues 
    //                            are available
    //                            can do this way while still using SequenceTrack.getRange function
    //                   
    // update:
    //                  OR (C), hybrid of A and B, block-based AND leveraging SequenceTrack.getRange()
    //    originally tried (B), but after struggling a bit with SequenceTrack.getRange() etc., now leaning 
    //       trying (C)
/*
     var track = this;
    if (scale === track.browserParams.charWidth)  {
	// need to float sequence residues over selected row(s)
	var seqTrack = this.getSequenceTrack();
	seqTrack.getRange(containerStart, containerEnd, 
              // see 
	      // callback, gets called for every block that overlaps with containerStart->containerEnd range
	      //   start = genome coord of first bp of block
	      //   end = genome coord of 
	      function(start, end, seq) {
		  
	      }
	);
    }
*/
};

/** 
 * handles adding overlay of sequence residues to "row" of selected feature
 *   (also handled in similar manner in fillBlock());
 * WARNING:
 *    this _requires_ browser support for pointer-events CSS property, 
 *    (currently supported by Firefox 3.6+, Chrome 4.0+, Safari 4.0+)
 *    (Exploring possible workarounds for IE, for example see:
 *        http://www.vinylfox.com/forwarding-mouse-events-through-layers/
 *        http://stackoverflow.com/questions/3680429/click-through-a-div-to-underlying-elements
 *            [ see section on CSS conditional statement workaround for IE ]
 *    )
 *    and must set "pointer-events: none" in CSS rule for div.annot-sequence
 *    otherwise, since sequence overlay is rendered on top of selected features 
 *        (and is a sibling of feature divs), events intended for feature divs will 
 *        get caught by overlay and not make it to the feature divs
 */
AnnotTrack.prototype.selectionAdded = function(feat, smanager)  {
    DraggableFeatureTrack.prototype.selectionAdded.call(this, feat, smanager);
    // console.log("AnnotTrack.selectionAdded, count = " + AnnotTrack.annotSelectionManager.getSelection().length);
    var track = this;
    // want to get child of block, since want position relative to block
    // so get top-level feature div (assumes top level feature is always rendered...)
    var topfeat = feat;
    while (topfeat.parent)  {  
    	topfeat = topfeat.parent;
    }
    var featdiv = track.getFeatDiv(topfeat);
    if (featdiv)  {
	//	    track.selectionYPosition = $(featdiv).position().top;
        var selectionYPosition = $(featdiv).position().top;
	var scale = track.gview.bpToPx(1);
	//	console.log("scale: " + scale + ", charWidth: " + track.browserParams.charWidth);
	if (scale === track.browserParams.charWidth && track.useResiduesOverlay)  {
	    var seqTrack = this.getSequenceTrack();
	    for (var bindex = this.firstAttached; bindex <= this.lastAttached; bindex++)  {
		var block = this.blocks[bindex];
		seqTrack.getRange(block.startBase, block.endBase, 
                    function(start, end, seq) {
			// console.log("AnnotTrack.selectionAdded(), adding seq from %d to %d: %s", 
			//				    start, end, seq);
			// var ypos = $(topfeat).position().top; 
			// +2 hardwired adjustment to center (should be calc'd based on feature div dims?	    
			var ypos = selectionYPosition + 2;
			// checking to see if residues for this "row" of the block are already present
			//    ( either from another selection in same row, or previous rendering 
			//        of same selection [which often happens when scrolling] )
			// trying to avoid duplication both for efficiency and because re-rendering of text can 
			//    be slighly off from previous rendering, leading to bold / blurry text when overlaid

			var $seqdivs = $("div.annot-sequence", block);
			var sindex = $seqdivs.length;
			var add_residues = true;
			if ($seqdivs && sindex > 0)  {
			    for (var i=0; i<sindex; i++) {
				var sdiv = $seqdivs[i];
				if ($(sdiv).position().top === ypos)  {
				    // console.log("residues already present in block: " + bindex);
				    add_residues = false;
				}
			    }
			}
			if (add_residues)  {
			    var seqNode = document.createElement("div");
			    seqNode.className = "annot-sequence";
			    seqNode.appendChild(document.createTextNode(seq));


			    // console.log("ypos: " + ypos);
			    seqNode.style.cssText = "top: " + ypos + "px;";
			    block.appendChild(seqNode);
			    if (track.FADEIN_RESIDUES)  {
				$(seqNode).hide();
				$(seqNode).fadeIn(1500);
			    }
			}
		    } );
		
	    }
	}
    }

};

AnnotTrack.prototype.selectionRemoved = function(feat, smanager)  {
    // console.log("AnnotTrack.selectionRemoved() called");
    DraggableFeatureTrack.prototype.selectionRemoved.call(this, feat, smanager);
    var track = this;
    if (feat.track === track)  {
	var featdiv = track.getFeatDiv(feat);
	// remove sequence text nodes
	// console.log("removing base residued text from selected annot");
	$("div.annot-sequence", track.div).remove();
	track.selectionYPosition = null;
    }
};

AnnotTrack.prototype.startZoom = function(destScale, destStart, destEnd) {
    DraggableFeatureTrack.prototype.startZoom.call(this, destScale, destStart, destEnd);
    // console.log("AnnotTrack.startZoom() called");
/*
     var track = this;
    var selected = this.selectionManager.getSelection();
    for (var i=0; i<selected.length; i++) {
	var feat = selected[i];
	var featdiv = track.getFeatDiv(feat);
	if (featdiv)  {
	    $("div.annot-sequence", featdiv).hide();
	}
    }
*/
};

AnnotTrack.prototype.endZoom = function(destScale, destBlockBases) {
    DraggableFeatureTrack.prototype.endZoom.call(this, destScale, destBlockBases);
    // console.log("AnnotTrack.endZoom called");
/*    var track = this;
    // this.scale = destScale;   moved this.scale assignment to superclass DraggableFeatureTrack.endZoom() method

//    console.log(destScale);
//    console.log(track.browserParams.charWidth);
    // only show sequence residues for selected if zoomed all the way in to base pair visibility
    if (destScale === track.browserParams.charWidth)  {
	var selected = this.selectionManager.getSelection();
	for (var i=0; i<selected.length; i++) {
	    var feat = selected[i];
	    var featdiv = track.getFeatDiv(feat);
	    if (featdiv)  {
		$("div.annot-sequence", featdiv).show();
	    }
	}
    }
*/

};


/*
  Copyright (c) 2010-2011 Berkeley Bioinformatics Open Projects (BBOP)

  This package and its accompanying libraries are free software; you can
  redistribute it and/or modify it under the terms of the LGPL (either
  version 2.1, or at your option, any later version) or the Artistic
  License 2.0.  Refer to LICENSE for the full license text.

*/
