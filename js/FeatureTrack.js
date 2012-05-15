// VIEW

/**
 * @class
 */
function FeatureTrack( config, refSeq, browserParams ) {
    //config: object with:
    //            key:   display text track name
    //            label: internal track name (no spaces, odd characters)
    //            baseUrl: base URL to use for resolving relative URLs
    //                     contained in the track's configuration
    //            config: configuration info for this track
    //refSeq: object with:
    //         name:  refseq name
    //         start: refseq start
    //         end:   refseq end
    //browserParams: object with:
    //                changeCallback: function to call once JSON is loaded
    //                trackPadding: distance in px between tracks
    //                baseUrl: base URL for the URL in config

    if (arguments.length == 0)
      return;
    if (browserParams === undefined)  {return;}

    Track.call(this, config.label, config.key,
               false, browserParams.changeCallback);
// as of pre-1.3, no longer using this.fields?
//    this.fields = {};
    this.refSeq = refSeq;

    // TODO: this featureStore object should eventuallly be
    // instantiated by Browser and passed into this constructor, not
    // constructed here.

    this.config = config;
    // if no configuration file, create a blank (will get filled in by initializeConfig later)
    if (! this.config)  {
	this.config = {};
    }


//    this.featureStore = setupFeatureStore();
    // connect the store and track loadSuccess and loadFailed events
    // to eachother
//    dojo.connect( this.featureStore, 'loadSuccess', this, 'loadSuccess' );
//    dojo.connect( this.featureStore, 'loadFail',    this, 'loadFail' );


    //number of histogram bins per block
    this.numBins = 25;
    this.histLabel = false;
    this.padding = 5;
    this.glyphHeightPad = 2;
    this.levelHeightPad = 2;
    this.trackPadding = browserParams.trackPadding;

    var thisObj = this;
    // GAH newJSON merge notes
    // need to redo this to go through new config.events setup
    this.featureClick = function(event) { thisObj.onFeatureClick(event); };

    // base Track.load() doesn't use trackMeta arg, but some subclasses FeatureTrack.load() do

    // if no urlTemplate, then this.url will be undefined (but data needed to load may be present in 
    //      in trackMeta)
// 1.3.1 MERGE -- call featurestore load (no FeatureTrack load anymore)
//    this.load(this.url, trackMeta);

//    this.featureStore.load();
    this.featureStore = this.load();
}

FeatureTrack.prototype = new Track("");

/**
 * Mixin: Track.YScaleMixin.
 */
dojo.mixin( FeatureTrack.prototype, Track.YScaleMixin );


FeatureTrack.prototype.load = function()  {
    var storeclass = this.config.backendVersion == 0 ? SeqFeatureStore.NCList_v0 : SeqFeatureStore.NCList;
    // 1.3.1 MERGE: for BamFeatureTrack, possibly others, will need to pass in entire config (was trackMeta), so 
    //     need to change signature of featurestore constructor
    this.featureStore = new storeclass({
        urlTemplate: this.config.urlTemplate,
        baseUrl: this.config.baseUrl,
        refSeq: this.refSeq,
        track: this
    });
    // connect the store and track loadSuccess and loadFailed events
    // to eachother
    dojo.connect( this.featureStore, 'loadSuccess', this, 'loadSuccess' );
    dojo.connect( this.featureStore, 'loadFail',    this, 'loadFail' );
    this.featureStore.load();
    return this.featureStore;
};


// 1.3.1 MERGE -- call to FeatureTrack.loadSuccess() is triggered by call to featurestore.loadSuccess(), 
//     because of prior connection via dojo.connect (this.featureStore, 'loadSuccess', this, 'loadSuccess' );
//  
FeatureTrack.prototype.loadSuccess = function(trackInfo, url) {
    var startTime = new Date().getTime();
    this.count = trackInfo.featureCount;
    this.uniqueIdField = trackInfo.uniqueIdField;

    // GAH newJSON merge notes
    //    no longer need fields, subFields etc. -- replace with calls to new ArrayRepr objects
//    this.fields = {};
//    for (var i = 0; i < trackInfo.headers.length; i++)  { this.fields[trackInfo.headers[i]] = i; }
//    this.subFields = {};
//    if (trackInfo.subfeatureHeaders) {
//        for (var i = 0; i < trackInfo.subfeatureHeaders.length; i++) { this.subFields[trackInfo.subfeatureHeaders[i]] = i; } }

    // average feature density per base (features/bp)
    if (trackInfo.featureCount)  {
	this.density = trackInfo.featureCount / this.refSeq.length; 
    }
    else  { // set a default density?
	this.density = 0.001;  // one feature per kilobase as default
    }

    // GAH newJSON merge notes
    //   URL fiddling handled now by Util.resolveUrl() ??  
    //      url passed as arg to loadSuccess already resolved and ready to pass to importExisting
/*    var importBaseUrl; 
    // ignoreTrackBaseUrl is deprecated (eventually TO BE REMOVED)
    if (trackInfo.ignoreTrackBaseUrl)  {
	console.log("ignoreTrackBaseUrl param true, so ignoring trackBaseUrl: " + this.trackBaseUrl);
	importBaseUrl = "";
    }
    else if (Util.startsWith(trackInfo.lazyfeatureUrlTemplate, "http:") || 
	     Util.startsWith(trackInfo.lazyfeatureUrlTemplate, "file:")) {
	console.log("lazyfeatureUrlTemplate is full URI, so ignoring trackBaseUrl: " + this.trackBaseUrl);
	importBaseUrl = "";
    }
    else  {
	console.log("trackBaseUrl: " + this.trackBaseUrl);
	importBaseUrl = this.trackBaseUrl;
    }
    console.log("url_template: " + trackInfo.lazyfeatureUrlTemplate);
*/


    /*  
     *   features Object contract:
     *        for FeatureTrack, features Object must implement:
     *             iterate()
     *             importExisting()   (only in FeatureTrack.loadSuccess())
     *             histogram()        (only in FeatureTrack.fillHist())
     *       Also, it's possible other NCList methods may get called in subclasses (ex: AnnotTrack)
     *       For subclasses that need features Object to be class other than NCList:
     *           If featureTrack.loadSuccess() is overriden to handle features initialization differently, then
     *                features need not implement importExisting()
     *           If no histogram mode, or histograms handled differently, then may not need histogram()
     *           Then only method absolutely needed is iterate() 
     *                 (though as of 2/2012, even features.iterate() is only used in:
     *                     FeatureTrack.fillFeatures() and
     *                     FeatureEdgeMatchManager.selectionAdded(), 
     *           
     */
// 1.3.1 MERGE -- NCList now created by SeqFeatureStore
 //    this.features = new NCList();  // moved to loadSuccess()

/*  GAH newJSON merge notes:  berkeleybop importExisting() call 
 *     this.features.importExisting(trackInfo.featureNCList,
                                 trackInfo.sublistIndex,
                                 trackInfo.lazyIndex,
                                 this.trackBaseUrl,
                                 importBaseUrl,
                                 trackInfo.lazyfeatureUrlTemplate);
*/
    // 1.3.1 MERGE for now keeping this.attrs var, until can update all code to use get/set accessors attached to feats/subfeats
    //  this.attrs = new ArrayRepr(trackInfo.intervals.classes);
    this.attrs = this.featureStore.attrs;
/*  1.3.1 MERGE now handled in SeqFeatureStore
     this.features.importExisting(trackInfo.intervals.nclist,
                                 this.attrs,
                                 url,
                                 trackInfo.intervals.urlTemplate,
                                 trackInfo.intervals.lazyClass);
*/
    this.initializeConfig();
 
/*  1.3.1 MERGE now handled in SeqFeatureStore
    if (trackInfo.histograms) {
        this.histograms = trackInfo.histograms;
        for (var i = 0; i < this.histograms.meta.length; i++) {
            this.histograms.meta[i].lazyArray =
                new LazyArray(this.histograms.meta[i].arrayParams, url);
        }
    }
*/

/*
    // GAH newJSON merge notes:  LazyArray no longer used for subfeatures, only for histograms 
    //    if (trackInfo.subfeatureArray)
    //        this.subfeatureArray = new LazyArray(trackInfo.subfeatureArray,
    //                                 importBaseUrl);
    
    // GAH newJSON merge notes: need to add back in histScale direct specification
    // if histScale is specified in track metadata, then use value directly as histScale (in pixels_per_base), 
    //     rather than also factoring in feature density
    // if current scale is < histscale then switch to histogram view

    // GAH newJSON merge notes: histScale, labelScale, subfeautreScale not used?  GMOD calc'ing in-place when needed instead
    // histScale: scale (in pixels/bp) below which histograms are displayed instead of individual features
    this.histScale = config.scaleThres.hist * (trackInfo.featureCount / this.refSeq.length);  
    // labelScale: scale (in pixels/bp above which labels are displayed)
    this.labelScale = config.scaleThres.label * (trackInfo.featureCount / this.refSeq.length);
    // subfeatureScale: scale (in pixels/bp) above which subfeatures are displayed)
    this.subfeatureScale = config.scaleThres.subfeature * (trackInfo.featureCount / this.refSeq.length);
    // replaced by this.config.style.className
    this.className = trackInfo.className;

    //    this.renderClassName = trackInfo.renderClassName;
    this.renderClassName = this.config.style.renderClassName; // ???
    this.subfeatureClasses = trackInfo.subfeatureClasses; // replaced by config.style.subfeatureClasses
    //    this.arrowheadClass = trackInfo.arrowheadClass;  // replaced by config.style.arrowheadClass

    // this.urlTemplate = trackInfo.urlTemplate;
    // this.histogramMeta = trackInfo.histogramMeta;
*/

    this.setLoaded();
};


FeatureTrack.prototype.initializeConfig = function()  {
       var defaultConfig = {
        style: {
            className: "feature2"
        },
        scaleThresh: {  // hist, label, subfeature all specified in pixels/avg_feature
            hist: 4,    // switch to histograms is typical feature is <= 4 pixels
            label: 50,  // show feature labels if typical feature size >= 50 pixels
            subfeature: 80  // show subfeatures if typical feature size >= 80 pixels  
        },
        hooks: {
	    /*   creation of feature div */
            create: function(track, feat, attrs) {
		// in JBrowse, feature click-linkouts are created here
		// for WebApollo, do not make feature click-linkouts (since click is used for selection)
		//      however feature labels are given click-linkouts elsewhere)
                var featDiv = document.createElement("div");
                return featDiv;
	    }

        },
        events: {
        }
    };

    if (! this.config.style.linkTemplate) {
        defaultConfig.events.click =
            function(track, elem, feat, event) {
	        alert( "clicked on feature\n" +
                       "start: " + (Number( feat.get('start') )+1) +
	               ", end: " + Number( feat.get('end') ) +
	               ", strand: " + feat.get('strand') +
	               ", label: " + feat.get('name') +
	               ", ID: " + feat.get('id') );
            };
    }
    Util.deepUpdate(defaultConfig, this.config);
    this.config = defaultConfig;

    this.config.hooks.create = this.evalHook(this.config.hooks.create);
    this.config.hooks.modify = this.evalHook(this.config.hooks.modify);

    // JBrowse supports specifying event handler function in track metadata (in config.event.[EVENT] property)
    //     these are called when [EVENT] occurs on a feature div within the track
    // But for WebApollo, allowing click, doubleclick, etc. to be configured in track metadata would conflict 
    //      with important WebApollo behavior (such as selection)
    // Therfore WebApollo does NOT support specifying event handlers in track metadata (at least for now)
/*
    this.eventHandlers = {};
    for (var event in this.config.events) {
        this.eventHandlers[event] =
            this.wrapHandler(this.evalHook(this.config.events[event]));
    }
*/
};

/*  if arg is a string, returns eval of arg, otherwise just returns arg */
FeatureTrack.prototype.evalHook = function(hook) {
    if (! ("string" == typeof hook)) return hook;
    var result;
    try {
         result = eval("(" + hook + ")");
    } catch (e) {
        console.log("eval failed for hook on track "
                    + this.name + ": " + hook);
    }
    return result;
};

/**
 * Make life easier for event handlers by handing them some things
 */
/* no used by WebApollo, instead individual event handlers calc this stuff as needed 
 FeatureTrack.prototype.wrapHandler = function(handler) {
    var track = this;
    return function(event) {
        event = event || window.event;
        if (event.shiftKey) return;
        var elem = (event.currentTarget || event.srcElement);
        //depending on bubbling, we might get the subfeature here
        //instead of the parent feature
        if (!elem.feature) elem = elem.parentElement;
        if (!elem.feature) return; //shouldn't happen; just bail if it does
        handler(track, elem, elem.feature, event);
    };
};
*/

/* Broken out of loadSuccess so that DraggableFeatureTrack can overload it */
FeatureTrack.prototype.onFeatureClick = function(event) {
    // var fields = thisObj.fields;
    var track = this;
//    var fields = this.fields;
    var attrs = track.attrs;
    event = event || window.event;
    if (event.shiftKey) return;
    var elem = (event.currentTarget || event.srcElement);
    //depending on bubbling, we might get the subfeature here
    //instead of the parent feature
    if (!elem.feature) elem = elem.parentElement;
    if (!elem.feature) return; //shouldn't happen; just bail if it does
    var feat = elem.feature;
    alert("WebApollo FeatureTrack.onFeatureClick(), clicked on feature\n" + 
          "start: " + (Number(attrs.get(feat, "Start"))+1) +
	  ", end: " + Number(attrs.get(feat, "End")) +
	  ", strand: " + attrs.get(feat, "Strand") +
	  ", label: " + attrs.get(feat, "Name") +
	  ", ID: " + attrs.get(feat, "ID") );
};

FeatureTrack.prototype.setViewInfo = function(genomeView, numBlocks,
                                              trackDiv, labelDiv,
                                              widthPct, widthPx, scale) {
    Track.prototype.setViewInfo.apply(this, arguments );
    this.setLabel(this.key);
};

//FeatureTrack.prototype.fillHist = function(blockIndex, block,
//                                           leftBase, rightBase,
//                                           stripeWidth) {


/**
 * Return an object with some statistics about the histograms we will
 * draw for a given block size in base pairs.
 * @private
 */
FeatureTrack.prototype._histDimensions = function( blockSizeBp ) {
    // bases in each histogram bin that we're currently rendering
    var bpPerBin = blockSizeBp / this.numBins;
    var pxPerCount = 2;
    var logScale = false;
    var stats = this.featureStore.histograms.stats;
    var statEntry;
    for (var i = 0; i < stats.length; i++) {
        if (stats[i].basesPerBin >= bpPerBin) {
            //console.log("bpPerBin: " + bpPerBin + ", histStats bases: " + this.histStats[i].bases + ", mean/max: " + (this.histStats[i].mean / this.histStats[i].max));
            logScale = ((stats[i].mean / stats[i].max) < .01);
            pxPerCount = 100 / (logScale ?
                                Math.log(stats[i].max) :
                                stats[i].max);
            statEntry = stats[i];
            break;
        }
    }

    return {
        bpPerBin: bpPerBin,
        pxPerCount: pxPerCount,
        logScale: logScale,
        stats: statEntry
    };
};

FeatureTrack.prototype.fillHist = function(blockIndex, block,
                                           leftBase, rightBase,
                                           stripeWidth) {
    //    if (this.histogramMeta === undefined)  {return;}
    if (this.featureStore.histograms.meta === undefined)  { return; }

    var dims = this._histDimensions( Math.abs( rightBase - leftBase ) );

    var track = this;
    var makeHistBlock = function(hist) {
        var maxBin = 0;
        for (var bin = 0; bin < track.numBins; bin++) {
            if (typeof hist[bin] == 'number' && isFinite(hist[bin])) {
                maxBin = Math.max(maxBin, hist[bin]);
            }
        }
        var binDiv;
        for (var bin = 0; bin < track.numBins; bin++) {
            if (!(typeof hist[bin] == 'number' && isFinite(hist[bin])))
                continue;
            binDiv = document.createElement("div");
	    binDiv.className = track.config.style.className + "-hist";;
            binDiv.style.cssText =
                "left: " + ((bin / track.numBins) * 100) + "%; "
                + "height: "
                + (dims.pxPerCount * ( dims.logScale ? Math.log(hist[bin]) : hist[bin]))
                + "px;"
                + "bottom: " + track.trackPadding + "px;"
                + "width: " + (((1 / track.numBins) * 100) - (100 / stripeWidth)) + "%;"
                + (track.config.style.histCss ?
                   track.config.style.histCss : "");
            if (Util.is_ie6) binDiv.appendChild(document.createComment());
            block.appendChild(binDiv);
        }

        track.heightUpdate( dims.pxPerCount * ( dims.logScale ? Math.log(maxBin) : maxBin ),
                            blockIndex );
        track.makeHistogramYScale( Math.abs(rightBase-leftBase) );
    };

    // The histogramMeta array describes multiple levels of histogram detail,
    // going from the finest (smallest number of bases per bin) to the
    // coarsest (largest number of bases per bin).
    // We want to use coarsest histogramMeta that's at least as fine as the
    // one we're currently rendering.
    // TODO: take into account that the histogramMeta chosen here might not
    // fit neatly into the current histogram (e.g., if the current histogram
    // is at 50,000 bases/bin, and we have server histograms at 20,000
    // and 2,000 bases/bin, then we should choose the 2,000 histogramMeta
    // rather than the 20,000)
    var histogramMeta = this.featureStore.histograms.meta[0];
    for (var i = 0; i < this.featureStore.histograms.meta.length; i++) {
        if (dims.bpPerBin >= this.featureStore.histograms.meta[i].basesPerBin)
            histogramMeta = this.featureStore.histograms.meta[i];
    }

    // number of bins in the server-supplied histogram for each current bin
    var binCount = dims.bpPerBin / histogramMeta.basesPerBin;
    // if the server-supplied histogram fits neatly into our current histogram,
    if ((binCount > .9)
        &&
        (Math.abs(binCount - Math.round(binCount)) < .0001)) {
        // we can use the server-supplied counts
        var firstServerBin = Math.floor(leftBase / histogramMeta.basesPerBin);
        binCount = Math.round(binCount);
        var histogram = [];
        for (var bin = 0; bin < this.numBins; bin++)
            histogram[bin] = 0;

        histogramMeta.lazyArray.range(
            firstServerBin,
            firstServerBin + (binCount * this.numBins),
            function(i, val) {
                // this will count features that span the boundaries of
                // the original histogram multiple times, so it's not
                // perfectly quantitative.  Hopefully it's still useful, though.
                histogram[Math.floor((i - firstServerBin) / binCount)] += val;
            },
            function() {
                makeHistBlock(histogram);
            }
        );
    } else {
        // make our own counts
        this.featureStore.histogram( leftBase, rightBase,
                                     this.numBins, makeHistBlock);
    }
};

FeatureTrack.prototype.endZoom = function(destScale, destBlockBases) {
    this.clear();
};

FeatureTrack.prototype.updateViewDimensions = function( coords ) {
    Track.prototype.updateViewDimensions.apply( this, arguments );
    this.updateYScaleFromViewDimensions( coords );
};

FeatureTrack.prototype.fillBlock = function(blockIndex, block,
                                            leftBlock, rightBlock,
                                            leftBase, rightBase,
                                            scale, stripeWidth,
                                            containerStart, containerEnd) {

    // only update the label once for each block size
    var blockBases = Math.abs( leftBase-rightBase );
    if( this._updatedLabelForBlockSize != blockBases ){
        if (this.config.scaleThresh && 
	    this.config.scaleThresh.hist && 
	    scale < (this.featureStore.density * this.config.scaleThresh.hist)) {
            this.setLabel(this.key + "<br>per " + Math.round( blockBases / this.numBins) + "bp");
        } else {
            this.setLabel(this.key);
        }
        this._updatedLabelForBlockSize = blockBases;
    }

    //console.log("scale: %d, histScale: %d", scale, this.histScale);
    if (this.featureStore.histograms &&
        (scale < (this.featureStore.density * this.config.scaleThresh.hist)) ) {

	this.fillHist(blockIndex, block, leftBase, rightBase, stripeWidth,
                      containerStart, containerEnd);
    } else {

        // if we have transitioned to viewing features, delete the
        // y-scale used for the histograms
        if( this.yscale ) {
            this._removeYScale();
        }

	this.fillFeatures(blockIndex, block, leftBlock, rightBlock,
                          leftBase, rightBase, scale,
                          containerStart, containerEnd);
    }
};

/**
 * Creates a Y-axis scale for the feature histogram.  Must be run after
 * the histogram bars are drawn, because it sometimes must use the
 * track height to calculate the max value if there are no explicit
 * histogram stats.
 * @param {Number} blockSizeBp the size of the blocks in base pairs.
 * Necessary for calculating histogram stats.
 */
FeatureTrack.prototype.makeHistogramYScale = function( blockSizeBp ) {
    var dims = this._histDimensions( blockSizeBp);
    if( dims.logScale ) {
        console.error("Log histogram scale axis labels not yet implemented.");
        return;
    }
    var maxval = dims.stats ? dims.stats.max : this.height/dims.pxPerCount;
    maxval = dims.logScale ? log(maxval) : maxval;

    // if we have a scale, and it has the same characteristics
    // (including pixel height), don't redraw it.
    if( this.yscale && this.yscale_params
        && this.yscale_params.maxval == maxval
        && this.yscale_params.height == this.height
        && this.yscale_params.blockbp == blockSizeBp
      ) {
        return;
      } else {
          this._removeYScale();
          this.makeYScale({ min: 0, max: maxval });
          this.yscale_params = {
              height: this.height,
              blockbp: blockSizeBp,
              maxval: maxval
          };
      }
};

/**
 * Delete the Y-axis scale if present.
 * @private
 */
FeatureTrack.prototype._removeYScale = function() {
    if( !this.yscale )
        return;
    this.yscale.parentNode.removeChild( this.yscale );
    delete this.yscale_params;
    delete this.yscale;
};

FeatureTrack.prototype.cleanupBlock = function(block) {
    if (block && block.featureLayout) block.featureLayout.cleanup();
};

/**
 * Called when sourceBlock gets deleted.  Any child features of
 * sourceBlock that extend onto destBlock should get moved onto
 * destBlock.
 */
FeatureTrack.prototype.transfer = function(sourceBlock, destBlock, scale,
                                           containerStart, containerEnd) {

    if (!(sourceBlock && destBlock)) return;
    if (!sourceBlock.featureLayout) return;

    var destLeft = destBlock.startBase;
    var destRight = destBlock.endBase;
    var blockWidth = destRight - destLeft;
    var sourceSlot;

    var overlaps = (sourceBlock.startBase < destBlock.startBase)
                       ? sourceBlock.featureLayout.rightOverlaps
                       : sourceBlock.featureLayout.leftOverlaps;

    for (var i = 0; i < overlaps.length; i++) {
	//if the feature overlaps destBlock,
	//move to destBlock & re-position
	sourceSlot = sourceBlock.featureNodes[overlaps[i].id];
	if (sourceSlot && ("label" in sourceSlot)) {
            sourceSlot.label.parentNode.removeChild(sourceSlot.label);
	}
	if (sourceSlot && sourceSlot.feature) {
	    if ( sourceSlot.layoutEnd > destLeft
		 && sourceSlot.feature.get('start') < destRight ) {

                sourceBlock.removeChild(sourceSlot);
                delete sourceBlock.featureNodes[overlaps[i].id];

                var featDiv =
                    this.addFeatureToBlock(sourceSlot.feature, overlaps[i].id,
					   destBlock, scale,
					   containerStart, containerEnd);
            }
        }
    }
};


FeatureTrack.prototype.fillFeatures = function(blockIndex, block,
                                               leftBlock, rightBlock,
                                               leftBase, rightBase, scale,
                                               containerStart, containerEnd) {
    // console.log("FeatureTrack.fillFeatures() called");
    //arguments:
    //block: div to be filled with info
    //leftBlock: div to the left of the block to be filled
    //rightBlock: div to the right of the block to be filled
    //leftBase: starting base of the block
    //rightBase: ending base of the block
    //scale: pixels per base at the current zoom level
    //containerStart: don't make HTML elements extend further left than this
    //containerEnd: don't make HTML elements extend further right than this
    //0-based

    var layouter = new Layout(leftBase, rightBase);

    // GAH: new layouter means all previous divs from this block are removed??
    //   if so then this is where should be flushing out featToDiv maps
    block.featureLayout = layouter;
    block.featureNodes = {};
    block.style.backgroundColor = "#ddd";

    //are we filling right-to-left (true) or left-to-right (false)?
    var goLeft = false;
    if (leftBlock && leftBlock.featureLayout) {
        leftBlock.featureLayout.setRightLayout(layouter);
        layouter.setLeftLayout(leftBlock.featureLayout);
    }
    if (rightBlock && rightBlock.featureLayout) {
        rightBlock.featureLayout.setLeftLayout(layouter);
        layouter.setRightLayout(rightBlock.featureLayout);
        goLeft = true;
    }

    //determine the glyph height, arrowhead width, label text dimensions, etc.
    if (!this.haveMeasurements) {
        this.measureStyles(); 
        this.haveMeasurements = true;
    }

    var curTrack = this;
    // NOT same as featureCallback in track.featureCallback
    // called by features.iterate() for every feature in features that overlaps startBase:endBase
    var featCallback = function(feature, path) {
	// refactored ID retrieval/construction into getId() function 
	//    to allow easier FeatureTrack subclassing
	var uniqueId = feature.uid;
	if (!uniqueId)  {  
	    uniqueId = curTrack.getId(feature, path);
	    // feature.uniqueId = uniqueId;  // should be set in getId(), but just making sure
	} 

	if (uniqueId == "HWUSI-EAS594-R_0059:2:36:10569:14568#ACAGTG/294595-294695") {
	    console.log("FOUND BAM TEST FEATURE");
	}
        //console.log("ID " + uniqueId + (layouter.hasSeen(uniqueId) ? " (seen)" : " (new)"));
        if (layouter.hasSeen(uniqueId)) {
            //console.log("this layouter has seen " + uniqueId);
            return;
        }
/*
          var featDiv =
            curTrack.renderFeature(feature, uniqueId, block, scale,
                                   containerStart, containerEnd);
        block.appendChild(featDiv);
*/
          var featDiv =
            curTrack.addFeatureToBlock(feature, uniqueId, block, scale,
                                       containerStart, containerEnd);
    };

    var startBase = goLeft ? rightBase : leftBase;
    var endBase = goLeft ? leftBase : rightBase;

    this.featureStore.iterate(startBase, endBase, featCallback,
                          function () {
                              block.style.backgroundColor = "";
                              curTrack.heightUpdate(layouter.totalHeight,
                                                    blockIndex);
                          });
};

// refactored ID retrieval/construction into getId() function 
//    to allow easier FeatureTrack subclassing
// 
// Constructing ID from path means only unique within the track
// Constructing ID from path is only guaranteed to be unique if feature NCList is true nested containment list -- 
//      no duplication of entries within the nested lists
// DAS tracks are _not_ guarenteed to be true nested containment lists 
// But, DAS does guarantee uniqueness of DAS ID within the track
// Therefore, DAS tracks _must_ have uniqueIdField and set to "id" to guarantee uniqueness
FeatureTrack.prototype.getId = function(feature, path)  {
    // ID is a stringification of the path in the NCList where
    // the feature lives; it's unique across the top-level NCList
    // (the top-level NCList covers a track/chromosome combination)
    var id = feature.uid;
    if (!id)  {
	if (this.uniqueIdField)  {  
	    // id = feature[this.fields[this.uniqueIdField]];
	    id = this.attrs.get(feature, this.uniqueIdField);
	}
	else if (path)  {
	    id = path.join(",");
	}
	if (id)  { feature.uid = id; }
    }
    //  if uid not already set, 
    //     && no unique id field indicator, 
    //     && no path,
    // returns undefined
    // BUT this shouldn't happen!
    return id;
};

/**
*  This works for features that do not change.
*  However, will need another approach for features that can be edited (annotations),
*      since when number or order of subfeatures is changing, using index within
*      parent's subfeature array is not guaranteed to give unique ID
*/
FeatureTrack.prototype.getSubfeatId = function(subfeat, index, parentId)  {

    var id = subfeat.uid;
    if (!id)  {
	id = parentId + "." + index;
	subfeat.uid = id;
    }
    return id;
};

FeatureTrack.prototype.measureStyles = function() {
    //determine dimensions of labels (height, per-character width)
    var heightTest = document.createElement("div");
    heightTest.className = "feature-label";
    heightTest.style.height = "auto";
    heightTest.style.visibility = "hidden";
    heightTest.appendChild(document.createTextNode("1234567890"));
    document.body.appendChild(heightTest);
    this.nameHeight = heightTest.clientHeight;
    this.nameWidth = heightTest.clientWidth / 10;
    document.body.removeChild(heightTest);

    //measure the height of glyphs
    var glyphBox;
    heightTest = document.createElement("div");
    //cover all the bases: stranded or not, phase or not
    heightTest.className =
        this.config.style.className
        + " plus-" + this.config.style.className
        + " plus-" + this.config.style.className + "1";
    if (this.config.style.featureCss)
        heightTest.style.cssText = this.config.style.featureCss;
    heightTest.style.visibility = "hidden";
    if (Util.is_ie6) heightTest.appendChild(document.createComment("foo"));
    document.body.appendChild(heightTest);
    glyphBox = dojo.marginBox(heightTest);
    this.glyphHeight = Math.round(glyphBox.h + this.glyphHeightPad);
    // console.log("heightcalc: " + this.className + ", h = " + glyphBox.h + ", glyphHeight = " + this.glyphHeight);
    this.padding += glyphBox.w;
    document.body.removeChild(heightTest);

    //determine the width of the arrowhead, if any
    if (this.config.style.arrowheadClass) {
        var ah = document.createElement("div");
        ah.className = "plus-" + this.config.style.arrowheadClass;
        if (Util.is_ie6) ah.appendChild(document.createComment("foo"));
        document.body.appendChild(ah);
        glyphBox = dojo.marginBox(ah);
        this.plusArrowWidth = glyphBox.w;
        ah.className = "minus-" + this.config.style.arrowheadClass;
        glyphBox = dojo.marginBox(ah);
        this.minusArrowWidth = glyphBox.w;
        document.body.removeChild(ah);
    }
};

/** 
 *  GAH refactored combo of creating div and adding to block, to 
 *     allow subclass override where block may have substructure.
 */
FeatureTrack.prototype.addFeatureToBlock = function(feature, uniqueId, block, scale,
                                                containerStart, containerEnd) {
    var featDiv =
        this.renderFeature(feature, uniqueId, block, scale, containerStart, containerEnd);
    block.appendChild(featDiv);
};

FeatureTrack.prototype.renderFeature = function(feature, uniqueId, block, scale,
                                                containerStart, containerEnd) {
    if (!feature.uid)  {  // should have been set before in getId(), but just making sure
	feature.uid = uniqueId;
    }

    //featureStart and featureEnd indicate how far left or right
    //the feature extends in bp space, including labels
    //and arrowheads if applicable
    var featureEnd = feature.get('end');
    var featureStart = feature.get('start');
    if( typeof featureEnd == 'string' )
        featureEnd = parseInt(featureEnd);
    if( typeof featureStart == 'string' )
        featureStart = parseInt(featureStart);

    //scale: pixels per base at the current zoom level
    // 1.3.1 MERGE -- 
    //     JBrowse now draws arrowheads within feature genome coord bounds
    //     For WebApollo we're keeping arrow outside of feature genome coord bounds, 
    //           because otherwise arrow can obscure edge-matching, CDS/UTR transitions, small inton/exons, etc.
    if (this.config.style.arrowheadClass) {
        switch (feature.get('strand')) {
        case 1:
        case '+':
            featureEnd   += (this.plusArrowWidth / scale); break;
        case -1:
        case '-':
            featureStart -= (this.minusArrowWidth / scale); break;
        }
    }

    var levelHeight = this.glyphHeight + this.levelHeightPad;

    // if the label extends beyond the feature, use the
    // label end position as the end position for layout
    var name = feature.get('name');
    var labelScale = this.featureStore.density * this.config.scaleThresh.label;
    if (name && (scale > labelScale)) {
	featureEnd = Math.max(featureEnd,
                              featureStart + ((name ? name.length : 0)
				              * (this.nameWidth / scale) ) );
        levelHeight += this.nameHeight;
    }
    featureEnd += Math.max(1, this.padding / scale);

    var top = block.featureLayout.addRect(uniqueId,
                                          featureStart,
                                          featureEnd,
                                          levelHeight);

    // default create() makes <a> link if linkable URL, or <div> if no URL
    var featDiv = this.config.hooks.create(this, feature, this.attrs);  

    block.featureNodes[uniqueId] = featDiv;
    if (!feature.track)  { feature.track = this; }

    /*  WebApollo doesn't use configurable event handlers
    for (var event in this.eventHandlers) {
        featDiv["on" + event] = this.eventHandlers[event];
    }
     */
    featDiv.onclick = this.featureClick;

    featDiv.feature = feature;
    featDiv.layoutEnd = featureEnd;

    block.featureNodes[uniqueId] = featDiv;
    
    // WebApollo: if no className given in trackList entry, indicates should determine class 
    //    based on feature type 
    //    this is temporary fix for tracks that have multiple types of top-level features, with different rendering 
    //       for each.  Should really merge className and subfeatureClasses with some default for non-types toplevels?
    var cname = this.config.style.className;
    if (cname == "{type}") {
	var ftype = feature.get('type');
	// console.log("determining style based on type: " + ftype);
	if (ftype) { cname = ftype; }
	else  { cname = "unknown"; }
    }

    var strand = feature.get('strand');
    switch (strand) {
    case 1:
    case '+':
        featDiv.className = "plus-" + cname; break;
    case 0:
    case '.':
    case null:
    case undefined:
        featDiv.className = cname; break;
    case -1:
    case '-':
        featDiv.className = "minus-" + cname; break;
    }

    var phase = feature.get('phase');
    if ((phase !== null) && (phase !== undefined))
        featDiv.className = featDiv.className + " " + featDiv.className + "_phase" + phase;

    // Since some browsers don't deal well with the situation where
    // the feature goes way, way offscreen, we truncate the feature
    // to exist betwen containerStart and containerEnd.
    // To make sure the truncated end of the feature never gets shown,
    // we'll destroy and re-create the feature (with updated truncated
    // boundaries) in the transfer method.
    var displayStart = Math.max( feature.get('start'), containerStart );
    var displayEnd = Math.min( feature.get('end'), containerEnd );
    var minFeatWidth = 1;
    var blockWidth = block.endBase - block.startBase;
    var featwidth = Math.max(minFeatWidth, (100 * ((displayEnd - displayStart) / blockWidth)));
    featDiv.style.cssText =
        "left:" + (100 * (displayStart - block.startBase) / blockWidth) + "%;"
        + "top:" + top + "px;"
        + " width:" + featwidth + "%;"
        + (this.config.style.featureCss ? this.config.style.featureCss : "");
    
	
    // GAH newJSON merge notes: featureCallback replaced by config.hooks.modify further down
    // if (this.featureCallback) this.featureCallback(feature, fields, featDiv);

    if ( this.config.style.arrowheadClass ) {
        var ah = document.createElement("div");
        var featwidth_px = featwidth/100*blockWidth*scale;
        switch (strand) {
        case 1:
        case '+':
            if( featwidth_px > this.plusArrowWidth*1.1 ) {
                ah.className = "plus-" + this.config.style.arrowheadClass;
                // ah.style.cssText = "position: absolute; right: 0px; top: 0px; z-index: 100;";
		// in WebApollo, arrowheads extend beyond feature coords
		ah.style.cssText =  "left: 100%; top: 0px;";
                featDiv.appendChild(ah);
            }
            break;
        case -1:
        case '-':
            if( featwidth_px > this.minusArrowWidth*1.1 ) {
                ah.className = "minus-" + this.config.style.arrowheadClass;
                // ah.style.cssText = "position: absolute; left: 0px; top: 0px; z-index: 100;";
		// in WebApollo, arrowheads extend beyond feature coords
		ah.style.cssText = "left: " + (-this.minusArrowWidth) + "px; top: 0px;";
                featDiv.appendChild(ah);
            }
            break;
        }
    }

    if (name && (scale > labelScale)) {
        var labelDiv;
        var featUrl = this.featureUrl(feature);
        if (featUrl) {
            labelDiv = document.createElement("a");
            labelDiv.href = featUrl;
            labelDiv.target = featDiv.target;
        } else {
            labelDiv = document.createElement("div");
        }
        for (event in this.eventHandlers) {
            labelDiv["on" + event] = this.eventHandlers[event];
        }

        labelDiv.className = "feature-label";
        labelDiv.appendChild(document.createTextNode(name));
        labelDiv.style.cssText =
            "left: "
            + (100 * (featureStart - block.startBase) / blockWidth)
            + "%; "
            + "top: " + (top + this.glyphHeight) + "px;";
	featDiv.label = labelDiv;
        labelDiv.feature = feature;
        block.appendChild(labelDiv);
    }

    if( featwidth > minFeatWidth ) {
	//    var subfeatures = this.attrs.get(feature, "Subfeatures");
        var subfeatures = feature.get('subfeatures');
        if( subfeatures ) {
	    //   refactoring subfeature handling/loading into 
	    //   handleSubFeatures() method to allow for subclasses to 
	    //   handle differently
	    this.handleSubFeatures(feature, featDiv, displayStart, displayEnd, block);
        }
    }

    if (this.config.hooks.modify) {
        this.config.hooks.modify(this, feature, featDiv);
    }

    //ie6 doesn't respect the height style if the div is empty
    if (Util.is_ie6) featDiv.appendChild(document.createComment());
    //TODO: handle event-handler-related IE leaks
    return featDiv;
};

// refactored subfeature handling/loading into 
//   handleSubFeatures() method to allow for subclasses to 
//   handle differently
FeatureTrack.prototype.handleSubFeatures = function(feature, featDiv, 
						    displayStart, displayEnd, block)  {
    // only way to get here is via renderFeature(parent,...), 
    //   so parent guaranteed to have unique ID set by now
    var parentId = feature.uid;  
    //    var subfeats = feature[this.fields["subfeatures"]];
    var subfeats = this.attrs.get(feature, "Subfeatures");
    var slength = subfeats.length;

    for (var i = 0; i < slength; i++) {
	var subfeat = subfeats[i];
	var uid = subfeat.uid;
	if (!uid)  {
	    uid = this.getSubfeatId(subfeat, i, parentId);
	    subfeat.uid= uid;
	}
        this.renderSubfeature(feature, featDiv, subfeat, displayStart, displayEnd, block);
    }
};

FeatureTrack.prototype.featureUrl = function(feature) {
    var urlValid = true;
    if (this.config.style.linkTemplate) {
        var href = this.config.style.linkTemplate.replace(
                /\{([^}]+)\}/g,
               function(match, group) {
                   var val = feature.get( group.toLowerCase() );
                   if (val !== undefined)
                       return val;
                   else
                       urlValid = false;
                   return 0;
               });
        if( urlValid )
            return href;
    }
    return undefined;
};

FeatureTrack.prototype.renderSubfeature = function(feature, featDiv, subfeature,
                                                   displayStart, displayEnd, block) {
    if (!subfeature.parent)  { subfeature.parent = feature; }
    var subStart = subfeature.get('start');
    var subEnd = subfeature.get('end');
    var featLength = displayEnd - displayStart;

    if (!subfeature.track)  {
	subfeature.track = this;
    }

    var className = "unknown";
    if (this.config.style.subfeatureClasses) {
	// type undefined, then assign "unknown" className root 
	//     (so subfeature is rendered with default "unknown" CSS styling)
	// if type = null, then className = null (so subfeature is not rendered as a div at all)
	// otherwise use tempName as className root (so subfeature is rendered with based on type name
        // var type = this.attrs.get(subfeature, "Type");
	var type = subfeature.get('type');
        className = this.config.style.subfeatureClasses[type];
	// if (className === undefined)  { className = this.config.style.className + '-' + type;}  // JBrowse
	if (className === undefined)  { className = "unknown"; }  // WebApollo 

	// if subfeatureClasses specifies that subfeature type explicitly maps to null classNmae, 
	//     or no config.style.subfeatureClasses to do map types, 
	//     then don't render the feature
	if (className === null) { return; }  
    }

    var subDiv = document.createElement("div");

    var strand = this.attrs.get(subfeature, "Strand");
    switch (strand)  {
    case 1:
    case '+':
    case '1':
	subDiv.className= "plus-" + className; break;
    case 0:
    case '0':
    case '.':
    case null:   
    case undefined:   
	subDiv.className = className; break;
    case -1:
    case '-':
    case '-1':
	subDiv.className = "minus-" + className; break;
    }
    // if (debug_feat)  {  console.log("className: " + className); }
    block.featureNodes[subfeature.uid] = subDiv;

    // if the feature has been truncated to where it doesn't cover
    // this subfeature anymore, just skip this subfeature
    if ((subEnd <= displayStart) || (subStart >= displayEnd)) return undefined;

    if (Util.is_ie6) subDiv.appendChild(document.createComment());
    subDiv.style.cssText =
        "left: " + (100 * ((subStart - displayStart) / featLength)) + "%;"
        + "top: 0px;"
        + "width: " + (100 * ((subEnd - subStart) / featLength)) + "%;";

    subDiv.subfeature = subfeature;
    // GAH newJSON merge notes
    //    in GMOD, featureCallback replaced with config.hooks.modify, but only invoked 
    //       for features, not subfeatures
    //    if (this.featureCallback)
    //        this.featureCallback(subfeature, this.subFields, subDiv);
    featDiv.appendChild(subDiv);
    return subDiv;
};

/**
*  given a feature data struct being rendered on this track, return the div used for rendering the feature, 
*    or undefined if no div found
*  JBrowse should only have a single div for each feature (features that overlap multiple blocks are assigned 
*      to a single block within the set they overlap (and hence a single feat div is generated)
*/
FeatureTrack.prototype.getFeatDiv = function(feature)  {
    /*
      *  General idea is to loop through feature blocks and find div = block.featureNodes[feature.id]
      *  Hopefully can restrict to just visible (or at least "attached" blocks)
      *      maybe by restricting to: Track.blocks[Track.firstAttached] to Track.blocks[Track.lastAttached]
      *  OR, create featToDiv[id] map for whole track, and modify whenever individual block.featureNodes are modified
      */

    // assuming "this" is track
    //    okay to pass null for the feature nclist path, since don't need for id construction 
    //       because for there to be a div associated with the feature, must 
    //       have already called renderFeature, which populates feature.uid, which in getId() 
    //       takes precedence over passed in path anyway
    var fid = this.getId(feature, null);
    //    console.log("looking for feature id: " + fid);

    for (var bindex = this.firstAttached; bindex <= this.lastAttached; bindex++)  {
	var block = this.blocks[bindex];
	if (block && block.featureNodes)  {
//	    for (key in block.featureNodes)  {
//		console.log(key + " : " + block.featureNodes[key]);
//	    }
	    var div = block.featureNodes[fid];
//	    console.log("found: " + div);
	    if (div && div != null)  {
		// console.log("returning div: ");
		// console.log(div);
		return div;
	    }
	}
    }
    
    // nothing found in any blocks
    return undefined;
};

/*

Copyright (c) 2007-2010 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
