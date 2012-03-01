function FeatureTrack(trackMeta, refSeq, browserParams) {
    //trackMeta: object with:
    //            key:   display text track name
    //            label: internal track name (no spaces, odd characters)
    //            sourceUrl: URL of the tracklist containing this track entry 
    //                  GAH newJSON merge notes: sourceUrl replaces previous "url": URL of the track's JSON file (for given refSeq)
    //            config: configuration info for this track (replaces trackInfo.clientConfig?)
    //refSeq: object with:
    //         name:  refseq name
    //         start: refseq start
    //         end:   refseq end
    //browserParams: object with:
    //                changeCallback: function to call once JSON is loaded
    //                trackPadding: distance in px between tracks
    //                baseUrl: base URL for the URL in trackMeta

    if (arguments.length == 0)
      return;
    if (browserParams === undefined)  {return;}
    Track.call(this, trackMeta.label, trackMeta.key,
	       false, browserParams.changeCallback);

    // GAH newJSON merge notes
    // this.fields no longer used, relying on new ArrayRepr class instead for fields, subfields, etc.
    //     this.fields = {};
    // 

    // GAH: newJSON merge notes
    // url fiddling no longer needed, GMOD/jbrowse Util.resolveUrl used instead?
    //     // baseUrl is dataRoot param passed to Browser constructor in index.html
    //    this.baseUrl = (browserParams.baseUrl ? browserParams.baseUrl : "");
    //    this.url = url;
    //    this.trackBaseUrl = (this.baseUrl + url).match(/^.+\//);

    this.refSeq = refSeq;
    // this.features = new NCList();  // moved to loadSuccess
    this.url = Util.resolveUrl(trackMeta.sourceUrl,
                               Util.fillTemplate(trackMeta.config.urlTemplate,
                                                 {'refseq': refSeq.name}) );
    //number of histogram bins per block
    this.numBins = 25;
    this.histLabel = false;
    this.padding = 5;
    this.glyphHeightPad = 2;
    this.levelHeightPad = 2;
    this.trackPadding = browserParams.trackPadding;
    console.log("baseUrl: " + this.baseUrl);
    console.log("url: " + this.url);
    console.log("trackBaseUrl: " + this.trackBaseUrl);
    this.trackMeta = trackMeta;

    var thisObj = this;

    // GAH newJSON merge notes
    // need to redo this to go through new config.events setup
    this.featureClick = function(event) { thisObj.onFeatureClick(event); };

    this.config = trackMeta.config;  
    // base Track.load() doesn't use trackMeta arg, but some subclasses FeatureTrack.load() do
    this.load(this.url, trackMeta);
}

FeatureTrack.prototype = new Track("");

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
    this.features = new NCList();  // moved to loadSuccess()

/*  GAH newJSON merge notes:  berkeleybop importExisting() call 
 *     this.features.importExisting(trackInfo.featureNCList,
                                 trackInfo.sublistIndex,
                                 trackInfo.lazyIndex,
                                 this.trackBaseUrl,
                                 importBaseUrl,
                                 trackInfo.lazyfeatureUrlTemplate);
*/
    this.attrs = new ArrayRepr(trackInfo.intervals.classes);
    this.features.importExisting(trackInfo.intervals.nclist,
                                 this.attrs,
                                 url,
                                 trackInfo.intervals.urlTemplate,
                                 trackInfo.intervals.lazyClass);
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
            create: function(track, feat, attrs) {
                var featDiv;
                var featUrl = track.featureUrl(feat);
                if (featUrl) {
                    featDiv = document.createElement("a");
                    featDiv.href = featUrl;
                    featDiv.target = "_new";
                } else {
                    featDiv = document.createElement("div");
                }
                return featDiv;
            }
        },
        events: {
        }
    };

    // GAH newJSON merge notes
    //     this bit from GMOD needs to be integrated with onFeatureClick refactoring in berkeleybop fork
    if (! this.config.linkTemplate) {
        defaultConfig.events.click =
            function(track, elem, feat, attrs, event) {
	        alert("clicked on feature\n" +
                      "start: " + attrs.get(feat, "Start") +
	              ", end: " + attrs.get(feat, "End") +
	              ", strand: " + attrs.get(feat, "Strand") +
	              ", label: " + attrs.get(feat, "Name") +
	              ", ID: " + attrs.get(feat, "ID") );
            };
    }

    Util.deepUpdate(defaultConfig, this.config);
    this.config = defaultConfig;

    this.config.hooks.create = this.evalHook(this.config.hooks.create);
    this.config.hooks.modify = this.evalHook(this.config.hooks.modify);

    this.eventHandlers = {};
    for (var event in this.config.events) {
        this.eventHandlers[event] =
            this.wrapHandler(this.evalHook(this.config.events[event]));
    }

    if (trackInfo.histograms) {
        this.histograms = trackInfo.histograms;
        for (var i = 0; i < this.histograms.meta.length; i++) {
            this.histograms.meta[i].lazyArray =
                new LazyArray(this.histograms.meta[i].arrayParams, url);
        }
    }

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
        handler(track, elem, elem.feature, track.attrs, event);
    };
};

/* Broken out of loadSuccess so that DraggableFeatureTrack can overload it */
FeatureTrack.prototype.onFeatureClick = function(event) {
    // var fields = thisObj.fields;
    var fields = this.fields;
    event = event || window.event;
    if (event.shiftKey) return;
    var elem = (event.currentTarget || event.srcElement);
    //depending on bubbling, we might get the subfeature here
    //instead of the parent feature
    if (!elem.feature) elem = elem.parentElement;
    if (!elem.feature) return; //shouldn't happen; just bail if it does
    var feat = elem.feature;
    alert("clicked on feature\nstart: " + feat[fields["start"]] +
	  ", end: " + feat[fields["end"]] +
	  ", strand: " + feat[fields["strand"]] +
	  ", label: " + feat[fields["name"]] +
	  ", ID: " + feat[fields["id"]]);
};

FeatureTrack.prototype.setViewInfo = function(genomeView, numBlocks,
                                              trackDiv, labelDiv,
                                              widthPct, widthPx, scale) {
    Track.prototype.setViewInfo.apply(this, [genomeView, numBlocks,
                                             trackDiv, labelDiv,
                                             widthPct, widthPx, scale]);
    this.setLabel(this.key);
};

FeatureTrack.prototype.fillHist = function(blockIndex, block,
                                           leftBase, rightBase,
                                           stripeWidth) {
    // console.log("called fillHist: " + leftBase + " ==> " + rightBase);
    if (this.histogramMeta === undefined)  {return;}
    // bases in each histogram bin that we're currently rendering
    var bpPerBin = (rightBase - leftBase) / this.numBins;
    var pxPerCount = 2;
    var logScale = false;

    var stats = this.histograms.stats;
    for (var i = 0; i < stats.length; i++) {
        if (stats[i].bases >= bpPerBin) {
            //console.log("bpPerBin: " + bpPerBin + ", histStats bases: " + this.histStats[i].bases + 
	    //    ", mean/max: " + (this.histStats[i].mean / this.histStats[i].max));
            logScale = ((stats[i].mean / stats[i].max) < .01);
            pxPerCount = 100 / (logScale ?
                                Math.log(stats[i].max) :
                                stats[i].max);
            break;
        }
    }
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
                + (pxPerCount * (logScale ? Math.log(hist[bin]) : hist[bin]))
                + "px;"
                + "bottom: " + track.trackPadding + "px;"
                + "width: " + (((1 / track.numBins) * 100) - (100 / stripeWidth)) + "%;"
                + (track.config.style.histCss ?
                   track.config.style.histCss : "");
            if (Util.is_ie6) binDiv.appendChild(document.createComment());
            block.appendChild(binDiv);
        }

        track.heightUpdate(pxPerCount * (logScale ? Math.log(maxBin) : maxBin),
                           blockIndex);
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
    var histogramMeta = this.histograms.meta[0];
    for (var i = 0; i < this.histograms.meta.length; i++) {
        if (bpPerBin >= this.histograms.meta[i].basesPerBin)
            histogramMeta = this.histograms.meta[i];
    }

    // number of bins in the server-supplied histogram for each current bin
    var binCount = bpPerBin / histogramMeta.basesPerBin;
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
        this.features.histogram(leftBase, rightBase,
                                this.numBins, makeHistBlock);
    }
};

FeatureTrack.prototype.endZoom = function(destScale, destBlockBases) {
    if (destScale < (this.density * this.config.scaleThresh.hist)) {
        this.setLabel(this.key + "<br>per " + Math.round(destBlockBases / this.numBins) + "bp");
    } else {
        this.setLabel(this.key);
    }
    this.clear();
};

FeatureTrack.prototype.fillBlock = function(blockIndex, block,
                                            leftBlock, rightBlock,
                                            leftBase, rightBase,
                                            scale, stripeWidth,
                                            containerStart, containerEnd) {
    //console.log("scale: %d, histScale: %d", scale, this.histScale);
    if (this.histograms &&
        (scale < (this.density * this.config.scaleThresh.hist)) ) {
	this.fillHist(blockIndex, block, leftBase, rightBase, stripeWidth,
                      containerStart, containerEnd);
    } else {
	this.fillFeatures(blockIndex, block, leftBlock, rightBlock,
                          leftBase, rightBase, scale,
                          containerStart, containerEnd);
    }
};

FeatureTrack.prototype.cleanupBlock = function(block) {
    if (block && block.featureLayout) block.featureLayout.cleanup();
};

FeatureTrack.prototype.transfer = function(sourceBlock, destBlock, scale,
                                           containerStart, containerEnd) {
    //transfer(sourceBlock, destBlock) is called when sourceBlock gets deleted.
    //Any child features of sourceBlock that extend onto destBlock should get
    //moved onto destBlock.

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
		 && this.attrs.get(sourceSlot.feature, "Start") < destRight ) {

                sourceBlock.removeChild(sourceSlot);
                delete sourceBlock.featureNodes[overlaps[i].id];

                var featDiv =
                    this.renderFeature(sourceSlot.feature, overlaps[i].id,
                                   destBlock, scale,
                                   containerStart, containerEnd);
                destBlock.appendChild(featDiv);
            }
        }
    }
};

FeatureTrack.prototype.fillFeatures = function(blockIndex, block,
                                               leftBlock, rightBlock,
                                               leftBase, rightBase, scale,
                                               containerStart, containerEnd) {
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
        //console.log("ID " + uniqueId + (layouter.hasSeen(uniqueId) ? " (seen)" : " (new)"));
        if (layouter.hasSeen(uniqueId)) {
            //console.log("this layouter has seen " + uniqueId);
            return;
        }
        var featDiv =
            curTrack.renderFeature(feature, uniqueId, block, scale,
                                   containerStart, containerEnd);
        block.appendChild(featDiv);
    };

    var startBase = goLeft ? rightBase : leftBase;
    var endBase = goLeft ? leftBase : rightBase;


    this.features.iterate(startBase, endBase, featCallback,
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
	    id = feature[this.fields[this.uniqueIdField]];
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

FeatureTrack.prototype.renderFeature = function(feature, uniqueId, block, scale,
                                                containerStart, containerEnd) {
    if (!feature.uid)  {  // should have been set before in getId(), but just making sure
	feature.uid = uniqueId;
    }

    //featureStart and featureEnd indicate how far left or right
    //the feature extends in bp space, including labels
    //and arrowheads if applicable
    var featureEnd = this.attrs.get(feature, "End");
    var featureStart = this.attrs.get(feature, "Start");
    if (this.arrowheadClass) {
        switch (this.attrs.get(feature, "Strand")) {
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
    var name = this.attrs.get(feature, "Name");
    var labelScale = this.density * this.config.scaleThresh.label;
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

    // GAH newJSON merge notes: onclick assignment replaced by eventHandlers from config.events
    //   need to revise to use berkeleybop featureClick code
//    featDiv.onclick = this.featureClick;
    for (event in this.eventHandlers) {
        featDiv["on" + event] = this.eventHandlers[event];
    }
    featDiv.feature = feature;
    featDiv.layoutEnd = featureEnd;

    block.featureNodes[uniqueId] = featDiv;

    var strand = this.attrs.get(feature, "Strand");
    switch (strand) {
    case 1:
    case '+':
        featDiv.className = "plus-" + this.config.style.className; break;
    case 0:
    case '.':
    case null:
    case undefined:
        featDiv.className = this.config.style.className; break;
    case -1:
    case '-':
        featDiv.className = "minus-" + this.config.style.className; break;
    }

    var phase = this.attrs.get(feature, "Phase");
    if ((phase !== null) && (phase !== undefined))
        featDiv.className = featDiv.className + " " + featDiv.className + "_phase" + phase;

    // Since some browsers don't deal well with the situation where
    // the feature goes way, way offscreen, we truncate the feature
    // to exist betwen containerStart and containerEnd.
    // To make sure the truncated end of the feature never gets shown,
    // we'll destroy and re-create the feature (with updated truncated
    // boundaries) in the transfer method.
    var displayStart = Math.max(this.attrs.get(feature, "Start"),
                                containerStart);
    var displayEnd = Math.min(this.attrs.get(feature, "End"),
                              containerEnd);
    var blockWidth = block.endBase - block.startBase;
    featDiv.style.cssText =
        "left:" + (100 * (displayStart - block.startBase) / blockWidth) + "%;"
        + "top:" + top + "px;"
        + " width:" + (100 * ((displayEnd - displayStart) / blockWidth)) + "%;"
        + (this.config.style.featureCss ? this.config.style.featureCss : "");
    
	
    // GAH newJSON merge notes: featureCallback replaced by config.hooks.modify further down
    // if (this.featureCallback) this.featureCallback(feature, fields, featDiv);

    if (this.config.style.arrowheadClass) {
        var ah = document.createElement("div");
        switch (strand) {
        case 1:
        case '+':
            ah.className = "plus-" + this.config.style.arrowheadClass;
            ah.style.cssText = "left: 100%; top: 0px;";
            featDiv.appendChild(ah);
            break;
        case -1:
        case '-':
            ah.className = "minus-" + this.config.style.arrowheadClass;
            ah.style.cssText =
                "left: " + (-this.minusArrowWidth) + "px; top: 0px;";
            featDiv.appendChild(ah);
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

    var subfeatures = this.attrs.get(feature, "Subfeatures");
// GAH newJSON merge notes: 
//     in GMOD, no longer doing a threshold scale for subfeature rendering, 
//     instead, always rendering subfeats if feat is rendered
	//    if (subfeatures && scale > this.subfeatureScale) {
    if (subfeatures) {

	// refactoring subfeature handling/loading into 
	//   handleSubFeatures() method to allow for subclasses to 
	//   handle differently
	this.handleSubFeatures(feature, featDiv, displayStart, displayEnd, block);
    }

    if (this.config.hooks.modify) {
        this.config.hooks.modify(this, feature, this.attrs, featDiv);
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
    var attrs = this.attrs;
    if (this.urlTemplate) {
        var href = this.urlTemplate.replace(/\{([^}]+)\}/g,
        function(match, group) {
            var val = attrs.get(feature, group);
            if (val !== undefined)
                return val;
            else
                urlValid = false;
            return 0;
        });
        if(urlValid) return href;
    }
    return undefined;
};

FeatureTrack.prototype.renderSubfeature = function(feature, featDiv, subfeature,
                                                   displayStart, displayEnd, block) {
    if (!subfeature.parent)  { subfeature.parent = feature; }
    var subStart = this.attrs.get(subfeature, "Start");
    var subEnd = this.attrs.get(subfeature, "End");
    var featLength = displayEnd - displayStart;

    if (!subfeature.track)  {
	subfeature.track = this;
    }

    var className = null;
    if (this.config.style.subfeatureClasses) {
	// type undefined, then assign "unknown" className root 
	//     (so subfeature is rendered with default "unknown" CSS styling)
	// if type = null, then className = null (so subfeature is not rendered as a div at all)
	// otherwise use tempName as className root (so subfeature is rendered with based on type name
        var type = this.attrs.get(subfeature, "Type");
        var className = this.config.style.subfeatureClasses[type];
	if (className === undefined)  { className = "unknown"; }
	if (className)  {
	    var strand = this.attrs.get(subfeature, "Strand");
            switch (strand)  {
               case 1:
               case '+':
	       case '1':
		   subDiv.className = "plus-" + className; break;
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
	}
    }

    // if (debug_feat)  {  console.log("className: " + className); }
    // if subfeatureClasses specifies that subfeature type explicitly maps to null classNmae, 
    //     or no config.style.subfeatureClasses to do map types, 
    //     then don't render the feature
    if (!className)  { 
	return null;
    }

    var subDiv = document.createElement("div");
    subDiv.className = className;
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
