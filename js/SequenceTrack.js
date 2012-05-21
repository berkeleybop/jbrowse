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
    var track = this;
    track.show_reverse_strand = true;
    track.show_protein_translation = true;

    DraggableFeatureTrack.call( track, config, refSeq, browserParams);

 /*   
    track.watch("height", function(id, oldval, newval)  {
		    if (newval == 0)  {
			console.log("   setting height to 0");
		    }
		    if (newval == 25 || oldval == 25) {
			console.log("SequenceTrack height changed to or from default/label height: " + oldval + " ==> " + newval);
		    }
		    return newval;
	} );
*/


    track.residues_context_menu = new dijit.Menu({});  // placeholder till setAnnotTrack() triggers real menu init
    track.annot_context_menu = new dijit.Menu({});     // placeholder till setAnnotTrack() triggers real menu init

    this.residuesMouseDown = function(event) { track.onResiduesMouseDown(event); };

    // this.selectionManager = this.setSelectionManager(SequenceTrack.seqSelectionManager);

    this.config = config;

    this.charWidth = browserParams.charWidth;
    this.seqHeight = browserParams.seqHeight;
    // splitting seqHeight into residuesHeight and translationHeight, so future iteration may be possible 
    //    for DNA residues and protein translation to be different styles
    this.dnaHeight = this.seqHeight;
    this.proteinHeight = this.seqHeight;

    this.refSeq = refSeq;

    // TODO: this should be passed into the constructor instead of
    // being instantiated here
    this.sequenceStore = new SequenceStore.StaticChunked({
							     baseUrl: config.baseUrl,
							     urlTemplate: config.residuesUrlTemplate,
							     compress: config.compress
							 });

    this.trackPadding = 10;
    this.SHOW_IF_FEATURES = true;
    // this.setLoaded();

//    this.initContextMenu();


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
dojo.require("dijit.MenuSeparator");

dojo.addOnLoad( function()  {  /* add dijit menu stuff here? */ } );

SequenceTrack.prototype.loadSuccess = function(trackInfo)  {

    console.log("SequenceTrack.loadSuccess called");
    DraggableFeatureTrack.prototype.loadSuccess.call(this, trackInfo);
    var track = this;
    // for AnnotTrack, features currently MUST be an NCList
    //    var features = this.features;
    this.features = this.featureStore.nclist;
		     
    track.featureCount = track.storedFeatureCount();
    console.log("storedFeatureCount = " + track.featureCount);
    //    this.initContextMenu();
    console.log("Codon Table");
    console.log(CodonTable);
}

/** called by AnnotTrack to initiate sequence alterations load, 
 */
SequenceTrack.prototype.loadSequenceAlterations = function() {
    var track = this;
    var features = this.featureStore.nclist;
    /**
     *    now do XHR to WebApollo AnnotationEditorService for "get_sequence_alterations"
     */
     dojo.xhrPost( {
    	postData: '{ "track": "' + track.annotTrack.getUniqueTrackName() + '", "operation": "get_sequence_alterations" }',
    	url: context_path + "/AnnotationEditorService",
    	handleAs: "json",
    	timeout: 5 * 1000, // Time in milliseconds
    	// The LOAD function will be called on a successful response.
    	load: function(response, ioArgs) { //
    		var responseFeatures = response.features;
    		for (var i = 0; i < responseFeatures.length; i++) {
    			var jfeat = JSONUtils.createJBrowseSequenceAlteration(features.attrs, responseFeatures[i]);
    			features.add(jfeat, responseFeatures[i].uniquename);
    		}
    		track.hideAll();
    		track.changed();
    	},
    	// The ERROR function will be called in an error case.
    	error: function(response, ioArgs) { //
    		return response; //
    	}
    });
};


SequenceTrack.prototype.startZoom = function(destScale, destStart, destEnd) {
    // would prefer to only try and hide dna residues on zoom if previous scale was at base pair resolution
    //   (otherwise there are no residues to hide), but by time startZoom is called, pxPerBp is already set to destScale, 
    //    so would require keeping prevScale var around, or passing in prevScale as additional parameter to startZoom()
    // so for now just always trying to hide residues on a zoom, whether they're present or not
    
    // if (prevScale == this.charWidth) {
    $(".dna-residues", this.div).css('display', 'none');
    $(".block-seq-container", this.div).css('height', '20px');
    // }
    this.heightUpdate(20);
    this.gview.trackHeightUpdate(this.name, Math.max(this.labelHeight, 20));
};


SequenceTrack.prototype.endZoom = function(destScale, destBlockBases) {
    if ((destScale == this.charWidth) ||
	(this.SHOW_IF_FEATURES && this.featureCount > 0) ) {
	this.show();
    }
    else  {
	this.hide();
    }
    DraggableFeatureTrack.prototype.clear.apply(this);
//    this.prevScale = destScale;
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
    if ( (scale == this.charWidth) ||  
	(this.SHOW_IF_FEATURES && this.featureCount > 0) ) {
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
    var verbose = false;
    // test block for diagnostics
    // var verbose = (leftBase === 245524);

    var fillArgs = arguments;
    var track = this;
    if ((scale == this.charWidth) ||
	(this.SHOW_IF_FEATURES && this.featureCount > 0) ) {
        this.show();
    } else {
        this.hide();
        this.heightUpdate(0);
    }
    var blockHeight = 0;

    if (this.shown) {
        // make a div to contain the sequences
        var seqNode = document.createElement("div");
        seqNode.className = "sequence";
	// seq_block_container style sets width = 100%, so seqNode fills the block width 
	//    regardless of whether holding residue divs or not
	$(seqNode).addClass("block-seq-container");  
	block.appendChild(seqNode);

	var slength = rightBase - leftBase;

	// just always add two base pairs to front and end, 
	//    to make sure can do three-frame translation across for every base position in (leftBase..rightBase), 
	//    both forward (need tw pairs on end) and reverse (need 2 extra bases at start)
	var leftExtended = leftBase - 2;
	var rightExtended = rightBase + 2;

	if (scale == this.charWidth) {
	    // this.sequenceStore.getRange( this.refSeq, leftBase, rightBase,
	   //  this.sequenceStore.getRange( this.refSeq, leftBase, endBase,
	    this.sequenceStore.getRange( this.refSeq, leftExtended, rightExtended, 
		   function( start, end, seq ) {

		       // fill with leading blanks if the
		       // sequence does not extend all the way
		       // across our range
		       for( ; start < 0; start++ ) {
			   seq = SequenceTrack.nbsp + seq; //nbsp is an "&nbsp;" entity
		       }

		       var blockStart = start + 2;
		       var blockEnd = end - 2;
		       var blockResidues = seq.substring(2, seq.length-2);
		       var blockLength = blockResidues.length;
		       var extendedStart = start;
		       var extendedEnd = end;
		       var extendedStartResidues = seq.substring(0, seq.length-2);
		       var extendedEndResidues = seq.substring(2);

		       if (verbose)  { 
			   console.log("seq: " + seq + ", length: " + seq.length);
			   console.log("blockResidues: " + blockResidues + ", length: " + blockResidues.length);
			   console.log("extendedStartResidues: " + extendedStartResidues + ", length: " + extendedStartResidues.length);
			   console.log("extendedEndResidues: " + extendedEndResidues + ", length: " + extendedEndResidues.length);
		       }

		       if (track.show_protein_translation) {
			   var framedivs = [];
			   for (var i=0; i<3; i++) {
			       // var tstart = start + i;
			       var tstart = blockStart + i;
			       var frame = tstart % 3;
 			       if (verbose) { console.log("  forward translating: offset = " + i + ", frame = " + frame); }
			       var transProtein = track.renderTranslation( extendedEndResidues, i, blockLength);
			       $(transProtein).addClass("frame" + frame);
			       framedivs[frame] = transProtein;
			   }
			   for (var i=2; i>=0; i--) {
			       var transProtein = framedivs[i];
			       // if (verbose) { console.log("frame: " + i); console.log(framedivs); console.log(transProtein); }
			       seqNode.appendChild(transProtein);
			       $(transProtein).bind("mousedown", track.residuesMouseDown);
			       blockHeight += track.proteinHeight;
			   }
		       }

		       /*
  		       var dnaContainer = document.createElement("div");
		       $(dnaContainer).addClass("dna-container");  
		       seqNode.appendChild(dnaContainer);
		       */

		       // add a div for the forward strand
		       var forwardDNA = track.renderResidues( blockResidues );
		       $(forwardDNA).addClass("forward-strand");
		       seqNode.appendChild( forwardDNA );
		       // dnaContainer.appendChild(forwardDNA);
		       track.residues_context_menu.bindDomNode(forwardDNA);
		       $(forwardDNA).bind("mousedown", track.residuesMouseDown);
		       blockHeight += track.dnaHeight;

		       if (track.show_reverse_strand) {
			   // and one for the reverse strand
			   // var reverseDNA = track.renderResidues( start, end, track.complement(seq) );
			   var reverseDNA = track.renderResidues( track.complement(blockResidues) );
			   $(reverseDNA).addClass("reverse-strand");
			   seqNode.appendChild( reverseDNA );
			   // dnaContainer.appendChild(reverseDNA);
			   track.residues_context_menu.bindDomNode(reverseDNA);
			   $(reverseDNA).bind("mousedown", track.residuesMouseDown);
			   blockHeight += track.dnaHeight;
		       }

		       if (track.show_protein_translation && track.show_reverse_strand) {
			   var extendedReverseComp = track.reverseComplement(extendedStartResidues);
			   if (verbose)  { console.log("extendedReverseComp: " + extendedReverseComp); }
			   var framedivs = [];
			   for (var i=0; i<3; i++) {
			       var tstart = blockStart + i;
			       // var frame = tstart % 3;
			       var frame = (track.refSeq.length - blockEnd + i) % 3;
			       var transProtein = track.renderTranslation( extendedStartResidues, i, blockLength, true);
			       $(transProtein).addClass("frame" + frame);
			       framedivs[frame] = transProtein;
			   }
			   // for (var i=2; i>=0; i--) {
			   for (var i=0; i<3; i++) {
			       var transProtein = framedivs[i];
			       seqNode.appendChild(transProtein);
			       $(transProtein).bind("mousedown", track.residuesMouseDown);
			       blockHeight += track.proteinHeight;
			   }
		       }
	               DraggableFeatureTrack.prototype.fillBlock.apply(track, fillArgs);
		       blockHeight += 5;  // a little extra padding below (track.trackPadding used for top padding)
	               // this.blockHeights[blockIndex] = blockHeight;  // shouldn't be necessary, done in track.heightUpdate();
		       track.heightUpdate(blockHeight, blockIndex);
		   }
	     );
	}
	else  {
	    blockHeight = 20;  // default dna track height if not zoomed to base level
	    seqNode.style.height = "20px";
	    DraggableFeatureTrack.prototype.fillBlock.apply(track, arguments);
	    // this.blockHeights[blockIndex] = blockHeight;  // shouldn't be necessary, done in track.heightUpdate();
	    track.heightUpdate(blockHeight, blockIndex);
	}
    } else {
        this.heightUpdate(0, blockIndex);
    }
};

SequenceTrack.prototype.heightUpdate = function(height, blockIndex)  {    
    // console.log("SequenceTrack.heightUpdate: height = " + height + ", bindex = " + blockIndex);
    DraggableFeatureTrack.prototype.heightUpdate.call(this, height, blockIndex);
};


SequenceTrack.prototype.addFeatureToBlock = function(feature, uniqueId, block, scale,
                                                     containerStart, containerEnd) {
    var featDiv =
        this.renderFeature(feature, uniqueId, block, scale, containerStart, containerEnd);
    $(featDiv).addClass("sequence-alteration");

    var seqNode = $("div.sequence", block).get(0);
    // var seqNode = $("div.dna-container", block).get(0);
    featDiv.style.top = "0px";
    var ftype = feature.get("type");
    if (ftype) {
	if (ftype == "deletion") {

	}
	else if (ftype == "insertion") {
	    if (scale == this.charWidth) {
		var container  = document.createElement("div");
		var residues = feature.get("residues");
		$(container).addClass("dna-residues");
		container.appendChild( document.createTextNode( residues ) );
		container.style.position = "absolute";
		container.style.top = "-16px";
		container.style.border = "2px solid #00CC00";
		container.style.backgroundColor = "#AAFFAA";
		featDiv.appendChild(container);
	    }
	    else  {
		// 
	    }
	}
	else if ((ftype == "substitution")) {	 
	    if (scale == this.charWidth) {
		var container  = document.createElement("div");
		var residues = feature.get("residues");
		$(container).addClass("dna-residues");
		container.appendChild( document.createTextNode( residues ) );
		container.style.position = "absolute";
		container.style.top = "-16px";
		container.style.border = "1px solid black";
		container.style.backgroundColor = "#FFF506";
		featDiv.appendChild(container);
	    }
	    else  {
		
	    }
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

SequenceTrack.prototype.reverseComplement = function(seq) {
   return this.reverse(this.complement(seq));
}

SequenceTrack.prototype.reverse = function(seq) {
   return seq.split("").reverse().join("");
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
// SequenceTrack.prototype.renderResidues = function ( start, end, seq ) {
SequenceTrack.prototype.renderResidues = function ( seq ) {
    var container  = document.createElement("div");
    $(container).addClass("dna-residues");
    container.appendChild( document.createTextNode( seq ) );
    return container;
};

/** end is ignored, assume all of seq is translated (except nay extra bases at end) */
SequenceTrack.prototype.renderTranslation = function ( input_seq, offset, blockLength, reverse) {
    var verbose = false;
    // sequence of diagnostic block
    //    var verbose = (input_seq === "GTATATTTTGTACGTTAAAAATAAAAA" || input_seq === "GCGTATATTTTGTACGTTAAAAATAAA" );
    var seq;
    if (reverse) {
	seq = this.reverseComplement(input_seq);
	if (verbose) { console.log("revcomped, input: " + input_seq + ", output: " + seq); }
    }
    else  {
	seq = input_seq;	
    }
    var container  = document.createElement("div");
    $(container).addClass("dna-residues");
    $(container).addClass("aa-residues");
    $(container).addClass("offset" + offset);
    var prefix = "";
    var suffix = "";
    for (var i=0; i<offset; i++) { prefix += SequenceTrack.nbsp; }
    for (var i=0; i<(2-offset); i++) { suffix += SequenceTrack.nbsp; }

    var extra_bases = (seq.length - offset) % 3;
    var dnaRes = seq.substring(offset, seq.length - extra_bases);
    if (verbose)  { console.log("to translate: " + dnaRes + ", length = " + dnaRes.length); }
    var aaResidues = dnaRes.replace(/(...)/gi,  function(codon) { 
				     var aa = CodonTable[codon];
			             // if no mapping and blank in codon, return blank
				     // if no mapping and no blank in codon,  return "?"
				     if (!aa) { 
					 if (codon.indexOf(SequenceTrack.nbsp) >= 0) { aa = SequenceTrack.nbsp; }
					 else  { aa = "?"; }
				     }
				     return prefix + aa + suffix;
				     // return aa;
				 } );
    var trimmedAaResidues = aaResidues.substring(0, blockLength);
    if (verbose)  { console.log("AaLength: " + aaResidues.length + ", trimmedAaLength = " + trimmedAaResidues.length); }
    aaResidues = trimmedAaResidues;
    if (reverse) {
	var revAaResidues = this.reverse(aaResidues);
	if (verbose) { console.log("reversing aa string, input: \"" + aaResidues + "\", output: \"" + revAaResidues + "\""); }
	aaResidues = revAaResidues;
	while (aaResidues.length < blockLength)  {
	    aaResidues = SequenceTrack.nbsp + aaResidues;
	}
    }
    container.appendChild( document.createTextNode( aaResidues ) );
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
    if (this.annotTrack.permission & Permission.WRITE) {
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

    thisObj.annot_context_menu.onOpen = function(event) {
    	// keeping track of mousedown event that triggered annot_context_menu popup, 
    	//   because need mouse position of that event for some actions
    	thisObj.annot_context_mousedown = thisObj.last_mousedown_event;
    	// if (thisObj.permission & Permission.WRITE) { thisObj.updateMenu(); }
		dojo.forEach(this.getChildren(), function(item, idx, arr) {
			if (item._setSelected)  { item._setSelected(false); }  // test for function existence first
			if (item._onUnhover)  { item._onUnhover(); }  // test for function existence first
		});
    };

    /**
     *   context menu for right click on sequence residues
     */
    thisObj.residuesMenuItems = new Array();
    thisObj.residues_context_menu = new dijit.Menu({});
    index = 0;

    thisObj.residuesMenuItems["toggle_reverse_strand"] = index++;
    thisObj.residues_context_menu.addChild(new dijit.MenuItem( {
    		label: "Toggle Reverse Strand",
    		onClick: function(event) {
		    thisObj.show_reverse_strand = ! thisObj.show_reverse_strand;
		    thisObj.hideAll();
		    thisObj.changed();
    		    // thisObj.toggleReverseStrand();
    		}
    	} ));

    thisObj.residuesMenuItems["toggle_protein_translation"] = index++;
    thisObj.residues_context_menu.addChild(new dijit.MenuItem( {
    		label: "Toggle Protein Translation",
    		onClick: function(event) {
		    thisObj.show_protein_translation = ! thisObj.show_protein_translation;
		    thisObj.hideAll();
		    thisObj.changed();
    		    // thisObj.toggleProteinTranslation();
    		}
    	} ));


    if (this.annotTrack.permission & Permission.WRITE) {

	thisObj.residues_context_menu.addChild(new dijit.MenuSeparator());
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
    }
	thisObj.residues_context_menu.addChild(new dijit.MenuItem( {
		label: "..."
	} ));
    
	thisObj.residues_context_menu.onOpen = function(event) {
		// keeping track of mousedown event that triggered residues_context_menu popup, 
		//   because need mouse position of that event for some actions
		thisObj.residues_context_mousedown = thisObj.last_mousedown_event;
		// if (thisObj.permission & Permission.WRITE) { thisObj.updateMenu() }
		dojo.forEach(this.getChildren(), function(item, idx, arr) {
		     if (item._setSelected) { item._setSelected(false); }
	             if (item._onUnhover) { item._onUnhover(); }
		});
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
    
    var content = this.createAddSequenceAlterationPanel("insertion", gcoord);
    this.annotTrack.openDialog("Add Insertion", content);

    /*
    var track = this;
    var features = '[ { "uniquename": "insertion-' + gcoord + '","location": { "fmin": ' + gcoord + ', "fmax": ' + gcoord + ', "strand": 1 }, "residues": "A", "type": {"name": "insertion", "cv": { "name":"SO" } } } ]';
	dojo.xhrPost( {
		postData: '{ "track": "' + track.annotTrack.getUniqueTrackName() + '", "features": ' + features + ', "operation": "add_sequence_alteration" }',
		url: context_path + "/AnnotationEditorService",
		handleAs: "json",
		timeout: 5000, // Time in milliseconds
		// The LOAD function will be called on a successful response.
		load: function(response, ioArgs) {
		},
		// The ERROR function will be called in an error case.
		error: function(response, ioArgs) { //
			return response;
		}
	});
	*/

};

SequenceTrack.prototype.createGenomicDeletion = function()  {
    var gcoord = this.gview.getGenomeCoord(this.residues_context_mousedown);
    console.log("SequenceTrack.createGenomicDeletion() called at genome position: " + gcoord);
    
    var content = this.createAddSequenceAlterationPanel("deletion", gcoord);
    this.annotTrack.openDialog("Add Deletion", content);

};

SequenceTrack.prototype.createGenomicSubstitution = function()  {
    var gcoord = this.gview.getGenomeCoord(this.residues_context_mousedown);
    console.log("SequenceTrack.createGenomicSubstitution() called at genome position: " + gcoord);
    var content = this.createAddSequenceAlterationPanel("substitution", gcoord);
    this.annotTrack.openDialog("Add Substitution", content);
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
    var track = this;
    var features = "[ ";
    for (var i = 0; i < annots.length; ++i) {
    	var annot = annots[i];
    	if (i > 0) {
    		features += ", ";
    	}
    	features += '{ "uniquename": "' + annot.uid + '" }';
    }
    features += "]";
	dojo.xhrPost( {
		postData: '{ "track": "' + track.annotTrack.getUniqueTrackName() + '", "features": ' + features + ', "operation": "delete_sequence_alteration" }',
		url: context_path + "/AnnotationEditorService",
		handleAs: "json",
		timeout: 5000, // Time in milliseconds
		// The LOAD function will be called on a successful response.
		load: function(response, ioArgs) {
		},
		// The ERROR function will be called in an error case.
		error: function(response, ioArgs) { //
			return response;
		}
	});
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
	var featureArray = JSONUtils.createJBrowseSequenceAlteration(this.attrs, annots[i]);
	var id = annots[i].uniquename;
	if (! this.features.contains(id))  {
	    this.features.add(featureArray, id);
	}
    }
    track.hideAll();
    track.changed();
    track.featureCount = track.storedFeatureCount();
};

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
    track.featureCount = track.storedFeatureCount();
};

SequenceTrack.prototype.storedFeatureCount = function()  {
    // get accurate count of features loaded (should do this within the XHR.load() function
    var track = this;
    var count = 0;
    this.features.iterate(0, track.refSeq.length, function() { count++; });
    return count;
}

SequenceTrack.prototype.createAddSequenceAlterationPanel = function(type, gcoord) {
	var track = this;
	var content = dojo.create("div");
	var inputDiv = dojo.create("div", { }, content);
	var inputLabel = dojo.create("label", { innerHTML: type == "deletion" ? "Length" : "Sequence", class: "sequence_alteration_input_label" }, inputDiv);
	var inputField = dojo.create("input", { type: "text", size: 10, class: "sequence_alteration_input_field" }, inputDiv);
	var buttonDiv = dojo.create("div", { class: "sequence_alteration_button_div" }, content);
	var addButton = dojo.create("button", { innerHTML: "Add", class: "sequence_alteration_button" }, buttonDiv);
	
	var addSequenceAlteration = function() {
	    var ok = true;
	    if (inputField.value.length == 0) {
	    	alert("Input cannot be empty for " + type);
	    	ok = false;
	    }
	    if (ok) {
	    	var input = inputField.value.toUpperCase();
	    	if (type == "deletion") {
	    		if (input.match(/\D/)) {
	    			alert("The length must be a number");
	    			ok = false;
	    		}
	    		else {
	    			input = parseInt(input);
	    			if (input <= 0) {
	    				alert("The length must be a positive number");
	    				ok = false;
	    			}
	    		}
	    	}
	    	else {
	    		if (input.match(/[^ACGT]/)) {
	    			alert("The sequence should only containg A, C, G, T");
	    			ok = false;
	    		}
	    	}
	    }
	    if (ok) {
	    	var fmin = gcoord;
	    	var fmax;
	    	if (type == "insertion") {
	    		fmax = gcoord;
	    	}
	    	else if (type == "deletion") {
	    		fmax = gcoord + parseInt(input);
	    	}
	    	else if (type == "substitution") {
	    		fmax = gcoord + input.length;;
	    	}
	    	var feature = '"location": { "fmin": ' + fmin + ', "fmax": ' + fmax + ', "strand": 1 }, "type": {"name": "' + type + '", "cv": { "name":"SO" } }';
	    	if (type != "deletion") {
	    		feature += ', "residues": "' + input + '"';
	    	}
	    	var features = '[ { ' + feature + ' } ]';
	    	dojo.xhrPost( {
	    		postData: '{ "track": "' + track.annotTrack.getUniqueTrackName() + '", "features": ' + features + ', "operation": "add_sequence_alteration" }',
	    		url: context_path + "/AnnotationEditorService",
	    		handleAs: "json",
	    		timeout: 5000, // Time in milliseconds
	    		// The LOAD function will be called on a successful response.
	    		load: function(response, ioArgs) {
	    		},
	    		// The ERROR function will be called in an error case.
	    		error: function(response, ioArgs) { //
	    			track.handleError(response);
	    			return response;
	    		}
	    	});
	    	track.annotTrack.popupDialog.hide();
	    }
	}

	dojo.connect(inputField, "keypress", null, function(e) {
		var unicode = e.keyCode ? e.keyCode : e.charCode;
		if (unicode == 13) {
			addSequenceAlteration();
		}
	});
	
	dojo.connect(addButton, "onclick", null, function() {
		addSequenceAlteration();
	});
	
	return content;
};

SequenceTrack.prototype.handleError = function(response) {
	console.log("ERROR: ");
	console.log(response);  // in Firebug, allows retrieval of stack trace, jump to code, etc.
	var error = eval('(' + response.responseText + ')');
	if (error && error.error) {
		alert(error.error);
		return false;
	}
};

SequenceTrack.prototype.setAnnotTrack = function(annotTrack) {
	this.annotTrack = annotTrack;
	this.initContextMenu();
};

