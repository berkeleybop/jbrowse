// VIEW

/**
 * Track to display the underlying reference sequence, when zoomed in
 * far enough.
 * @class
 * @constructor
 * @param {Object} config
 *   key:   display text track name
 *   label: internal track name (no spaces or odd characters)
 *   urlTemplate: url of directory in which to find the sequence chunks
 *   chunkSize: size of sequence chunks, in characters
 * @param {Object} refSeq
 *  start: refseq start
 *  end:   refseq end
 *  name:  refseq name
 * @param {Object} browserParams
 *  changeCallback: function to call once JSON is loaded
 *  trackPadding: distance in px between tracks
 *  charWidth: width, in pixels, of sequence base characters
 *  seqHeight: height, in pixels, of sequence elements
 */
function SequenceTrack(config, refSeq, browserParams) {
//    var cback = browserParams ? browserParams.changeCallbck : null;

    if (arguments.length == 0)  { return; }
    if (browserParams === undefined) { return; }

    DraggableFeatureTrack.call( this, config, refSeq, browserParams);

    var track = this;
    this.residuesMouseDown = function(event) { track.onResiduesMouseDown(event); };

    // this.selectionManager = this.setSelectionManager(SequenceTrack.seqSelectionManager);

    this.config = config;

    this.charWidth = browserParams.charWidth;
    this.seqHeight = browserParams.seqHeight;

    this.refSeq = refSeq;

    // TODO: this should be passed into the constructor instead of
    // being instantiated here
    this.sequenceStore = new SequenceStore.StaticChunked({
                               baseUrl: config.baseUrl,
                               urlTemplate: config.residuesUrlTemplate,
                               compress: config.compress
                             });

    this.trackPadding = 10;


    // this.setLoaded();

/*
     $.contextMenu({
        selector: '.dna-residues', 
        callback: function(key, options) {
	    console.log("clicked on item: " + key);
	    console.log(options);
	    console.log(arguments);
        },
        items: {
            "showRevComp": {name: "Show Reverse Complement" }, 
            "showTranslations": {name: "Show Translation" }, 
            "sep1": "---------",
            "addInsertion": {name: "Add Genomic Insertion" }, 
	    "addDeletion":  {name: "Add Genomic Deletion" }, 
	    "addSubsitution": {name: "Add Genomic Substitution"}
        }, 
	 events: {
	     show: function(opt, context_event)  {
		 var $this = this;
		 console.log("called contextMenu.events.show(): ");
		 console.log($this.get(0));
		 console.log(arguments);
	     }
	 }
    });

     $.contextMenu({
        selector: '.sequence-alteration', 
        callback: function(key, options) {
	    console.log("clicked on item: " + key);
        },
        items: {
            "deleteAlteration": {name: "Delete Genomic Alteration" }
        }
    });
*/


    
}

// inherit from DraggableFeatureTrack
SequenceTrack.prototype = new DraggableFeatureTrack();

// annotSelectionManager is class variable (shared by all AnnotTrack instances)
// SequenceTrack.seqSelectionManager = new FeatureSelectionManager();

// setting up selection exclusiveOr -- 
//    if selection is made in annot track, any selection in other tracks is deselected, and vice versa, 
//    regardless of multi-select mode etc.
// SequenceTrack.seqSelectionManager.addMutualExclusion(DraggableFeatureTrack.selectionManager);
// SequenceTrack.seqSelectionManager.addMutualExclusion(AnnotTrack.annotSelectionManager);
//DraggableFeatureTrack.selectionManager.addMutualExclusion(SequenceTrack.seqSelectionManager);

/** Dojo context menu stuff */
dojo.require("dijit.Menu");
dojo.require("dijit.MenuItem");
dojo.require("dijit.Dialog");

dojo.addOnLoad( function()  {  /* add dijit menu stuff here? */ } );
dojo.require("dojox.grid.DataGrid");
dojo.require("dojo.data.ItemFileWriteStore");

SequenceTrack.prototype.loadSuccess = function(trackInfo)  {
    DraggableFeatureTrack.prototype.loadSuccess.call(this, trackInfo);
    var track = this;
    // for AnnotTrack, features currently MUST be an NCList
    //    var features = this.features;
    this.features = this.featureStore.nclist;

    this.initContextMenu();

    /**
     *    now do XHR to WebApollo AnnotationEditorService for "get_sequence_alterations"
     */
}

SequenceTrack.prototype.startZoom = function(destScale, destStart, destEnd) {
    this.hide();
    this.heightUpdate(0);
};

SequenceTrack.prototype.endZoom = function(destScale, destBlockBases) {
    if (destScale == this.charWidth) this.show();
    DraggableFeatureTrack.prototype.clear.apply(this);
};

/*
 * SequenceTrack.prototype.showRange = function(first, last, startBase, bpPerBlock, scale,
					     containerStart, containerEnd) {
    console.log("called SequenceTrack.showRange():");
    console.log({ first: first, last: last, startBase: startBase, bpPerBloc: bpPerBlock, scale: scale, 
		  containerStart: containerStart, containerEnd: containerEnd });
    DraggableFeatureTrack.prototype.showRange.apply(this, arguments);
};
*/

SequenceTrack.prototype.setViewInfo = function(genomeView, numBlocks,
                                               trackDiv, labelDiv,
                                               widthPct, widthPx, scale) {
		
    DraggableFeatureTrack.prototype.setViewInfo.apply(this, arguments);
    if (scale == this.charWidth) {
        this.show();
    } else {
        this.hide();
        this.heightUpdate(0);
    }
    this.setLabel(this.key);
};

SequenceTrack.nbsp = String.fromCharCode(160);

/**
 *   GAH
 *   not entirely sure, but I think this strategy of calling getRange() only works as long as 
 *   seq chunk sizes are a multiple of block sizes
 *   or in other words for a given block there is only one chunk that overlaps it
 *      (otherwise in the callback would need to fiddle with horizontal position of seqNode within the block) ???
 */
SequenceTrack.prototype.fillBlock = function(blockIndex, block,
                                             leftBlock, rightBlock,
                                             leftBase, rightBase,
                                             scale, stripeWidth,
                                             containerStart, containerEnd) {
    var fillArgs = arguments;
    var track = this;
    if (scale == this.charWidth) {
        this.show();
    } else {
        this.hide();
        this.heightUpdate(0);
    }

    if (this.shown) {
        this.sequenceStore.getRange( this.refSeq, leftBase, rightBase,
                       function( start, end, seq ) {

                           // fill with leading blanks if the
                           // sequence does not extend all the way
                           // across our range
                           for( ; start < 0; start++ ) {
                               seq = SequenceTrack.nbsp + seq; //nbsp is an "&nbsp;" entity
                           }

                           // make a div to contain the sequences
                           var seqNode = document.createElement("div");
                           seqNode.className = "sequence";
                           block.appendChild(seqNode);

                           // add a div for the forward strand
			   var forwardDNA = track.renderResidues( start, end, seq );
			   $(forwardDNA).addClass("forward-strand");
                           seqNode.appendChild( forwardDNA );
			   track.residues_context_menu.bindDomNode(forwardDNA);
			  $(forwardDNA).bind("mousedown", track.residuesMouseDown);
			   

                           // and one for the reverse strand
                           var reverseDNA = track.renderResidues( start, end, track.complement(seq) );
                           $(reverseDNA).addClass("reverse-strand");
                           seqNode.appendChild( reverseDNA );
			   track.residues_context_menu.bindDomNode(reverseDNA);
			   $(reverseDNA).bind("mousedown", track.residuesMouseDown);

			   DraggableFeatureTrack.prototype.fillBlock.apply(track, fillArgs);
                       }
                     );
        this.heightUpdate(this.seqHeight, blockIndex);
	// DraggableFeatureTrack.prototype.fillBlock.apply(this, arguments);

    } else {
        this.heightUpdate(0, blockIndex);
    }
};


SequenceTrack.prototype.addFeatureToBlock = function(feature, uniqueId, block, scale,
                                                containerStart, containerEnd) {
    // console.log("SequenceTrack.addFeatureToBlock() called");
    // console.log(block);
    var featDiv =
        this.renderFeature(feature, uniqueId, block, scale, containerStart, containerEnd);
    $(featDiv).addClass("sequence-alteration");
    var seqNode = $("div.sequence", block).get(0);
    // console.log(seqNode);
    featDiv.style.top = "0px";
    var ftype = feature.get("type");
   if (ftype) {
	if (ftype == "deletion") {

	}
	else if (ftype == "insertion") {
	    var container  = document.createElement("div");
	    var residues = feature.get("residues");
	    $(container).addClass("alteration-residues");
	    container.appendChild( document.createTextNode( residues ) );
	    container.style.position = "absolute";
	    container.style.bottom = "22px";
	    container.style.border = "2px solid #00CC00";
	    container.style.backgroundColor = "#AAFFAA";
	    featDiv.appendChild(container);
	}
	else if (ftype == "substitution") {	 
	    var container  = document.createElement("div");
	    var residues = feature.get("residues");
	    $(container).addClass("dna-residues");
	    container.appendChild( document.createTextNode( residues ) );
	    container.style.position = "absolute";
	    container.style.bottom = "22px";
	    container.style.border = "1px solid black";
	    container.style.backgroundColor = "#FFF506";
	    featDiv.appendChild(container);
	}
    }
    seqNode.appendChild(featDiv);
};


/**
 *  overriding renderFeature to add event handling right-click context menu
 */
SequenceTrack.prototype.renderFeature = function(feature, uniqueId, block, scale,
					      containerStart, containerEnd) {
    var track = this;
    var featDiv = DraggableFeatureTrack.prototype.renderFeature.call(this, feature, uniqueId, block, scale,
								     containerStart, containerEnd);

    if (featDiv && featDiv != null)  {
	track.annot_context_menu.bindDomNode(featDiv);
    }
    return featDiv;
}


SequenceTrack.prototype.complement = (function() {
    var compl_rx   = /[ACGT]/gi;

    // from bioperl: tr/acgtrymkswhbvdnxACGTRYMKSWHBVDNX/tgcayrkmswdvbhnxTGCAYRKMSWDVBHNX/
    // generated with:
    // perl -MJSON -E '@l = split "","acgtrymkswhbvdnxACGTRYMKSWHBVDNX"; print to_json({ map { my $in = $_; tr/acgtrymkswhbvdnxACGTRYMKSWHBVDNX/tgcayrkmswdvbhnxTGCAYRKMSWDVBHNX/; $in => $_ } @l})'
    var compl_tbl  = {"S":"S","w":"w","T":"A","r":"y","a":"t","N":"N","K":"M","x":"x","d":"h","Y":"R","V":"B","y":"r","M":"K","h":"d","k":"m","C":"G","g":"c","t":"a","A":"T","n":"n","W":"W","X":"X","m":"k","v":"b","B":"V","s":"s","H":"D","c":"g","D":"H","b":"v","R":"Y","G":"C"};

    var compl_func = function(m) { return compl_tbl[m] || SequenceTrack.nbsp; };
    return function( seq ) {
        return seq.replace( compl_rx, compl_func );
    };
})();

//given the start and end coordinates, and the sequence bases, makes a
//div containing the sequence
SequenceTrack.prototype.renderResidues = function ( start, end, seq ) {
    var container  = document.createElement("div");
    $(container).addClass("dna-residues");
    container.appendChild( document.createTextNode( seq ) );
    return container;
};

SequenceTrack.prototype.onResiduesMouseDown = function(event)  {
    this.last_mousedown_event = event;
}    

SequenceTrack.prototype.onFeatureMouseDown = function(event) {
    // _not_ calling DraggableFeatureTrack.prototyp.onFeatureMouseDown -- 
    //     don't want to allow dragging (at least not yet)
    // event.stopPropagation();
    this.last_mousedown_event = event;
    var ftrack = this;
    if (ftrack.verbose_selection || ftrack.verbose_drag)  { 
	console.log("SequenceTrack.onFeatureMouseDown called"); 
    }
    this.handleFeatureSelection(event);
};


SequenceTrack.prototype.initContextMenu = function() {
    var thisObj = this;
    this.context_path = "..";
    thisObj.contextMenuItems = new Array();
    thisObj.annot_context_menu = new dijit.Menu({});
/*	dojo.xhrPost( {
		sync: true,
		postData: '{ "track": "' + thisObj.getUniqueTrackName() + '", "operation": "get_user_permission" }',
		url: this.context_path + "/AnnotationEditorService",
		handleAs: "json",
		timeout: 5 * 1000, // Time in milliseconds
		// The LOAD function will be called on a successful response.
		load: function(response, ioArgs) { //
			var permission = response.permission;
			thisObj.permission = permission;
			var index = 0;
			if (permission & Permission.WRITE) {
				thisObj.annot_context_menu.addChild(new dijit.MenuItem( {
					label: "Delete",
					onClick: function() {
						thisObj.deleteSelectedFeatures();
					}
				} ));
				thisObj.contextMenuItems["delete"] = index++;
			}
			thisObj.annot_context_menu.addChild(new dijit.MenuItem( {
				label: "Information",
				onClick: function(event) {
					thisObj.getInformation();
				}
			} ));
			thisObj.contextMenuItems["information"] = index++;
			thisObj.annot_context_menu.addChild(new dijit.MenuItem( {
				label: "..."
			} ));
		},
		// The ERROR function will be called in an error case.
		error: function(response, ioArgs) { 
//		    thisObj.handleError(response);
		}
	});
*/

    var index = 0;
    thisObj.annot_context_menu.addChild(new dijit.MenuItem( {
	label: "Delete",
	onClick: function() {
	    thisObj.deleteSelectedFeatures();
	}
    } ));
    thisObj.contextMenuItems["delete"] = index++;
    thisObj.annot_context_menu.addChild(new dijit.MenuItem( {
	label: "Information",
	onClick: function(event) {
	    thisObj.getInformation();
	}
    } ));
    thisObj.contextMenuItems["information"] = index++;

    thisObj.annot_context_menu.onOpen = function(event) {
	// keeping track of mousedown event that triggered annot_context_menu popup, 
	//   because need mouse position of that event for some actions
	thisObj.annot_context_mousedown = thisObj.last_mousedown_event;
	// if (thisObj.permission & Permission.WRITE) { thisObj.updateMenu(); }
    };
	

/**
*   context menu for right click on sequence residues
*/
    thisObj.residuesMenuItems = new Array();
    thisObj.residues_context_menu = new dijit.Menu({});
    index = 0;
    thisObj.residues_context_menu.addChild(new dijit.MenuItem( {
	label: "Create Genomic Insertion",
	onClick: function() {
	    thisObj.createGenomicInsertion();
	}
    } ));
    thisObj.residuesMenuItems["create_insertion"] = index++;
    thisObj.residues_context_menu.addChild(new dijit.MenuItem( {
	label: "Create Genomic Deletion",
	onClick: function(event) {
	    thisObj.createGenomicDeletion();
	}
    } ));
    thisObj.residuesMenuItems["create_deletion"] = index++;

    thisObj.residues_context_menu.addChild(new dijit.MenuItem( {
	label: "Create Genomic Substitution",
	onClick: function(event) {
	    thisObj.createGenomicSubstitution();
	}
    } ));
    thisObj.residuesMenuItems["create_substitution"] = index++;

    
    thisObj.residues_context_menu.onOpen = function(event) {
	// keeping track of mousedown event that triggered residues_context_menu popup, 
	//   because need mouse position of that event for some actions
	thisObj.residues_context_mousedown = thisObj.last_mousedown_event;
	// if (thisObj.permission & Permission.WRITE) { thisObj.updateMenu() }
    };

    thisObj.annot_context_menu.startup();
    thisObj.residues_context_menu.startup();
};

SequenceTrack.prototype.getUniqueTrackName = function() {
	return this.name + "-" + this.refSeq.name;
};

SequenceTrack.prototype.createGenomicInsertion = function()  {
    var gcoord = this.gview.getGenomeCoord(this.residues_context_mousedown);
    console.log("SequenceTrack.createGenomicInsertion() called at genome position: " + gcoord);
};

SequenceTrack.prototype.createGenomicDeletion = function()  {
    var gcoord = this.gview.getGenomeCoord(this.residues_context_mousedown);
    console.log("SequenceTrack.createGenomicDeletion() called at genome position: " + gcoord);
};

SequenceTrack.prototype.createGenomicSubstitution = function()  {
    var gcoord = this.gview.getGenomeCoord(this.residues_context_mousedown);
    console.log("SequenceTrack.createGenomicSubstitution() called at genome position: " + gcoord);
};

SequenceTrack.prototype.deleteSelectedFeatures = function()  {
    console.log("SequenceTrack.deleteSelectedFeatures() called");
    var selected = this.selectionManager.getSelection();
    this.selectionManager.clearSelection();
    this.requestDeletion(selected);
};

SequenceTrack.prototype.requestDeletion = function(annots)  {
    console.log("SequenceTrack.requestDeletion called");
    console.log(annots);
}

SequenceTrack.prototype.getInformation = function()  {
    console.log("SequenceTrack.getInformation() called");
}

/**
* sequence alteration annotation ADD command received by a ChangeNotificationListener, 
*      so telling SequenceTrack to add to it's SeqFeatureStore
*/
SequenceTrack.prototype.addSequenceAlterations = function(annots)  {
    console.log("SequenceTrack.addSequenceAlterations() called");
    var track = this;
    // add to SeqFeatureStore
    for (var i = 0; i < annots.length; ++i) {
	var featureArray = JSONUtils.createJBrowseSequenceAlteration(this.attrs, responseFeatures[i]);
	var id = responseFeatures[i].uniquename;
	if (! this.features.contains(id))  {
	    this.features.add(featureArray, id);
	}
    }
    track.hideAll();
    track.changed();
}

/**
* sequence alteration annotation DELETE command received by a ChangeNotificationListener, 
*      so telling SequenceTrack to remove from it's SeqFeatureStore
*/
SequenceTrack.prototype.removeSequenceAlterations = function(annots)  {
    console.log("SequenceTrack.removeSequenceAlterations() called");
    var track = this;
    // remove from SeqFeatureStore
    for (var i = 0; i < annots.length; ++i) {
	var id_to_delete = annots[i].uniquename;
	this.features.deleteEntry(id_to_delete);
    }
    track.hideAll();
    track.changed();
}







