
console.log("browser supports HTML5 canvas: " + !!Modernizr.canvas);

// Check for the various File API support.
console.log("browser supports HTML5 window.File: " + !!window.File);
console.log("browser supports HTML5 window.FileReader: " + !!window.FileReader);
console.log("browser supports HTML5 window.FileList: " + !!window.FileList);
console.log("browser supports HTML5 window.Blob: " + !!window.Blob);

// CanvasTrack.renderers = [ "AvgBar_MaxBar", "AvgBar_MinPoint_MaxPoint", "AvgLine_MinMaxRange", "Heatmap1"];
// CanvasTrack.styleNames = [ "AvgBar + MaxBar", "AvgBar + MinPoint + MaxPoint", "AvgLine + MinMaxRange", "hmm...Heatmap1"];
CanvasTrack.renderers = { };
CanvasTrack.renderarray = [];  // just to keep a list of renderers ordered by their loading

CanvasTrack.registerRenderer = function(renderer) {
    console.log("adding renderer: " + renderer.ID);
    CanvasTrack.renderers[renderer.ID] = renderer;
    CanvasTrack.renderarray.push(renderer);
//    console.log(renderer);
//    console.log("finished adding renderer");

};

/**
 *   a CanvasTrack inherits the same basic block rendering strategy from Track, but 
 *       adds a canvas for each block, and when the block is rendered it delegates 
 *       to canvas rendering
 */
function CanvasTrack(trackMeta, url, refSeq, browserParams)  {
    console.log("called CanvasTrack constructor");
    Track.call(this, trackMeta.label, trackMeta.key, false, browserParams.changeCallback);
    this.refSeq = refSeq;
    this.baseUrl = (browserParams.baseUrl ? browserParams.baseUrl : "");
    this.url = url;
    this.trackBaseUrl = (this.baseUrl + url).match(/^.+\//);
    this.padding = 5;
    this.trackPadding = browserParams.trackPadding;
    this.trackMeta = trackMeta;
    var canvas_track = this;
    var dataurl = trackMeta.dataurl;
    
    $.ajax(
	{ 
	    url: dataurl, 
	    async: false, 
	    datatype: "text", 
	    // As of JQuery 1.5, data not actually passed in data arg???
	    //    but with JQuery 1.4 and 1.5, can get data from jqXHR.responseText
	    success: function(data, textStatus, jqXHR)  {
		console.log("loaded CanvasTrack data from: " + dataurl);
		// var textdata = data;  // for JQuery 1.4?
		var textdata = jqXHR.responseText;
		console.log("data size: " + textdata.length);
		canvas_track.parseData(textdata);
		
	    } , 
	    error: function(jqXHR, textStatus, errorThrown)  {
		console.log("CanvasTrack data load failed!");
		console.log(textStatus);
		console.log(errorThrown);
	    }
	} );
    this.load(this.baseUrl + url);
}


CanvasTrack.USE_PATH = false;
CanvasTrack.USE_LEVELS = true;
CanvasTrack.VERBOSE_YSCALING = false;
CanvasTrack.VERBOSE_RENDER = false;
CanvasTrack.prototype = new Track("");

CanvasTrack.prototype.loadSuccess = function(o)  {
    console.log("called CanvasTrack.loadSuccess()");
//    this.gbdiv = $("#GenomeBrowser")[0];
//    this.theview = gbdiv.genomeBrowser.view;
//    console.log(view);
}

CanvasTrack.prototype.setViewInfo = function(heightUpdate, numBlocks,
                                       trackDiv, labelDiv,
                                       widthPct, widthPx, scale) {
    // console.log("called CanvasTrack.setViewInfo");
    Track.prototype.setViewInfo.call(this, heightUpdate, numBlocks, trackDiv, labelDiv, widthPct, widthPx, scale);
    // Track.setViewInfo sets this.label = labelDiv
    this.setLabel(this.key);
    this.control = this.setUpGraphControl(labelDiv);

};

CanvasTrack.GRAPH_CONTROL_COUNT = 0;


CanvasTrack.prototype.setUpGraphControl = function()  {
    var track = this;
    var $labelDiv = $(this.label);
    var control = document.createElement("div");
    control.id = "graph_control_" + CanvasTrack.GRAPH_CONTROL_COUNT;
    var $control = $(control);
    $control.addClass("canvas-track-control");
    $control.hide();
    $labelDiv.append($control);
    this.$control = $control;
    $labelDiv.bind("dblclick", function(event)  {
		       // console.log("double-clicked on canvas track label:");
		       // console.log(track);
		       event.stopPropagation();
		       $labelDiv.toggleClass("active-track-label");
		       $control.toggle('slow');
		   } );
    // keep doubleclick on control from shutting window -- must double click on parent labelDiv
    $control.bind("dblclick", function(event) {
		      // console.log("double click on graph control");
		      event.stopPropagation();
		  } );

     $control.bind("click", function(event) {
		     // console.log("single click on graph control");
		      event.stopPropagation();
		  } );
    $control.bind("mousedown", function(event) {
		      // console.log("mouse down on graph control");
		      event.stopPropagation();
		  } );

    track.setBaseColor("#0000ff");
    var color_picker = document.createElement("div");
    color_picker.id = "graph_color_picker_" + CanvasTrack.GRAPH_CONTROL_COUNT;
    var $color_picker = $(color_picker);
    $color_picker.addClass("graph-color-picker");
    $color_picker.css('float', 'left');
    console.log("color picker id: " + color_picker.id);
    

    $control.append(color_picker);
   //  var colorPicker = $.farbtastic("#" + color_picker.id, function(color) {
   var colorPicker = $.farbtastic(color_picker, function(color) {
				       // console.log("new graph color picked: " + color);
				       // deriving graph display colors from chosen "base" color
				       //   for now, avg same as baseColor, max bar is reduced saturation, increased lightness
				       // using JQUery Colour Library plugin for color manipulation
				       track.setBaseColor(color);
				       track.renderTrack();
				   } );
    // colorPicker throws error, with message "view is undefined"
    //    BUT, initial color does get set
    try {
	colorPicker.setColor(track.baseColor);	
    } catch (e) {
	console.log("error calling colorPicker.setColor(): " + e.message);
    }

    var rangeSCC = document.createElement("div");
    var $rangeSCC = $(rangeSCC);
    $rangeSCC.css('float', 'left');
    $rangeSCC.css('padding', '10px');
    $rangeSCC.append("<div style='padding: px'>Graph Range</div>");

    var rangeSC= document.createElement("div");
    rangeSC.id = "graph_range_slider_" + CanvasTrack.GRAPH_CONTROL_COUNT;
    var $rangeSC = $(rangeSC);
    $rangeSC.addClass("graph-range-slider");
//    $rangeSC.css('float', 'left');

    //  using standard jQuery UI Slider plugin for now
    //  may want to try more flexible slider, for example
    //      JQ Slider (also a jQuery plugin): 
    //          http://www.egrappler.com/free-multi-node-range-data-slider-jqslider/
    var $slider = $rangeSC.slider( { 
		        orientation: "vertical", 
			range: true, 
			min: track.minviz,
		        max: track.maxviz, 
			values: [track.minviz, track.maxviz]
		      });

    $slider.bind("slide", function(event, ui) {
		     track.minviz = $slider.slider('values', 0);
		     track.maxviz = $slider.slider('values', 1);
		     if (CanvasTrack.VERBOSE_YSCALING)  { console.log("viz range: " + track.minviz + " - " + track.maxviz); }
		     // TODO: should be able to make this quite a bit more efficient by rendering only this track, 
		     //    and only redrawing on existing block canvases, rather than creating new blocks and canvases
		     // console.time('canvas_track_render');
		     // for (var i=0; i<10; i++) {  // only use loop to get realistic performance testing from timer
			 // absent other tracks, using more direct renderTrack() only yields at most 10% performance gain
			 // with other non-canvas tracks, about the same
			 // with other canvas tracks, not sure yet???
		         track.renderTrack();
			 // track.hideAll();
			 // track.changed();
		     //		     }
		     // console.timeEnd('canvas_track_render');
		 } );
    this.$slider = $slider;

    $rangeSCC.append(rangeSC);
    $control.append(rangeSCC);
    $control.append("<div style='padding: 5px; float: left'>           </div>");
    $control.append("<br></br><br><div style='padding: 5px; float: left'>Graph Style:</div>");
    
    console.log("setting up graph style choice callback");
    var chooser = document.createElement("select");
    chooser.id = "graph_style_chooser_" + CanvasTrack.GRAPH_CONTROL_COUNT;
    var $chooser = $(chooser);
    console.log($chooser);
    for (var i=0; i<CanvasTrack.renderarray.length; i++)  {
	var opt = document.createElement("option");
	var renderer = CanvasTrack.renderarray[i];
	opt.value = renderer.ID;
	opt.appendChild(document.createTextNode(renderer.NAME));
	$chooser.append(opt);
    }
    $chooser.change(function(event)  {
			console.log(event);
			console.log(event.currentTarget.value);
			track.setRenderer(event.currentTarget.value, true);
			// track.renderTrack(); // renderTrack() called in setRenderer()
		    }
		  );

    $control.append(chooser);

//    var horizontalLayout = jLayout.flexGrid({
//						rows: 1,
//						items: [color_picker, rangeSC]
//					    });
//    horizontalLayout.layout(control);
    
    CanvasTrack.GRAPH_CONTROL_COUNT++;
}

/**
 * Only limited functionality for now
 * 
 * not handling Wiggle type = fixed step (score)
 * not handling bedgraph (seq start end score)
 * assuming Wiggle type = variable step (pos score), 
 *   (and that score for i holds for every coord till next entry i+1)
 * TODO: Expand to handle all wiggle types
 */
CanvasTrack.prototype.parseData = function(data)  {
    console.log("calling CanvasTrack.parseData");
    var  lines = data.split('\n');
    var linecount = lines.length;
    // presize locs, scores, sums arrays
    var locs = new Array(linecount);
    var scores = new Array(linecount);
    var sums = new Array(linecount);
    var loc;
    var minviz = 1000000;
    var maxviz = -1000000;
    var score;
//    var score;
    console.log("line count: " + linecount);
    //  for (var i=0; i<linecount; i++)  {
    for (var i=0; i<linecount; i++)  {
	var line = lines[i];
	var fields = line.split('\t');
	if (fields && (fields.length == 2))  {
	    loc = fields[0];
	    if (loc.length > 0)  {
		locs[i] = parseInt(loc);
		score = parseFloat(fields[1]);
		scores[i] = score;
		if (score < minviz) { minviz = score; }
		if (score > maxviz) { maxviz = score; }
	    }
	}
    }
    this.locs = locs;
    this.scores = scores;
    // finding GenomeView, since not assigned yet (won't need this once loading asynchronously...?)
    this.gbdiv = $("#GenomeBrowser")[0];
    this.theview = this.gbdiv.genomeBrowser.view;
    console.log(this.theview);
//    this.wtree = new WigTree(locs, scores, theview.zoomLevels);
    this.wstack = new WigStack(locs, scores, this.theview.zoomLevels);
//    console.log("WigStack:");
//    console.log(this.wstack);

    var track = this;
    console.log("minviz = " + minviz + ", maxviz = " + maxviz);
    track.minviz = minviz * 100; 
//    track.minviz = 0;
    track.maxviz = maxviz * 100; 
//    track.maxviz = 100;
    track.setBaseColor("#0000ff");
    track.setRenderer(CanvasTrack.renderarray[0]);
    console.log("end of CanvasTrack.parseData");
};

CanvasTrack.prototype.setBaseColor = function(color, triggerRender)  {
    var track = this;
    track.baseColor = color;
    var baseHSL = $.Color(track.baseColor).toHSL();
    var hue = baseHSL.hue();
    var sat = baseHSL.saturationL();
    var lit = baseHSL.lightness();

    //    console.log("avg hue: " + hue + ", sat: " + sat + ", lit: " + lit);
    track.lighterColor = baseHSL.modify([hue, sat, (lit + (1-lit) * 0.7)]).toString();
    track.darkerColor = baseHSL.modify([hue, sat, (lit / 2)]).toString();
    track.unsatColor = baseHSL.modify([hue, (sat * 0.3), lit]).toString();
    track.unsatLighterColor = baseHSL.modify([hue, (sat * 0.3), (lit + (1-lit) * 0.7)]).toString();
    // etc.
    if (triggerRender) { track.renderTrack(); }
}

CanvasTrack.prototype.setRenderer = function(renderer, triggerRender)  {
    //    console.log("called CanvasTrack.prototype.setRenderer: ");
    //    console.log(renderer);
    var argtype = typeof(renderer);
    if (argtype === 'string')  {
	// console.log("CanvasTrack.prototype.setRenderer, string arg: " + renderer);
	this.renderer = CanvasTrack.renderers[renderer];
	if (!this.renderer)  {
	    console.log("error in CanvasTrack.prototype.setRenderer, no function matching string arg: " + renderer);
	    return;
	}
    }
    else if (argtype === 'function') { 
	this.renderer = renderer;
    }
    else  {
	console.log("error in CanvasTrack.prototype.setRenderer, arg not a string or function: " + renderer);
	return;
    }
    if (triggerRender)  { this.renderTrack(); }
}

/**
 *  given a genomic coord, return index into locs array of that coord
 *     (or if coord not in locs array, return index of closest coord in locs > genomic coord)
 */
CanvasTrack.prototype.getCoordIndex = function(base_coord)  {
    return this.binarySearch(this.locs, base_coord, true);
};

/**
 *  given a genomic coord and a summary level, return index into level.binMins array of that coord
 *     (or if coord not in binMins array, return index of closest coord in locs > genomic coord)
 */
CanvasTrack.prototype.getSumCoordIndex = function(base_coord, level)  {
    return this.binarySearch(level.binMins, base_coord, true);
}

/**
   From http://jsfromhell.com/array/search
   //+ Carlos R. L. Rodrigues
   //@ http://jsfromhell.com/array/search [rev. #2]

   search(vector: Array, value: Object, [insert: Boolean = false]): Integer
   Do a binary search on an *ordered* array, if it's not ordered, the behaviour is undefined.
   The function can return the index of the searched object as well the the index where it should be
   inserted to keep the array ordered.
   o: ordered array to search
   v: value to search for
   i: insert -- 
      if true, returns the index where the value was found, 
               or index where value should be inserted to keep the array ordered, 
      if false, returns the index where the value was found, 
               or -1 if it wasn't found
*/
CanvasTrack.prototype.binarySearch = function(o, v, i){
    var h = o.length, l = -1, m;
    while(h - l > 1)
        if(o[m = h + l >> 1] < v) l = m;
    else h = m;
    return o[h] != v ? i ? h : -1 : h;
};

CanvasTrack.prototype._showBlock = function(blockIndex, startBase, endBase, scale,
					    containerStart, containerEnd) {
    if (CanvasTrack.VERBOSE_RENDER)  { console.log("CanvasTrack._showBlock, blockIndex = " + blockIndex); }
    Track.prototype._showBlock.call(this, blockIndex, startBase, endBase, scale,
				    containerStart, containerEnd);
};

/**
 *  overriding Track._showBlock to create and attach a canvas to each block
 */
CanvasTrack.prototype.createBlock = function(blockIndex, startBase, endBase, scale,
					     containerStart, containerEnd) {
    if (CanvasTrack.VERBOSE_RENDER) { console.log("called CavasTrack createBlock, blockIndex = " + blockIndex); }
    var blockDiv = Track.prototype.createBlock.call(this, blockIndex, startBase, endBase, scale,
						    containerStart, containerEnd);
    var canvas = document.createElement("canvas");
    var $canvas = $(canvas);
    canvas.style.position = "absolute";
    canvas.style.width = "100%";
    //  canvas.style.height = "100%";
    canvas.style.height = "100px";
    canvas.style.left = "0%";
    canvas.style.top = "0%";
    $(canvas).addClass("block-canvas");
    /**
     * canvas.width and canvas.height are NOT the same as canvas.style.width and canvas.style.height
     * canvas.width and canvas.height set the default canvas coordinates (default transform from coords to pixels?)
     */
    // canvas.width =  derive from scale??
    // canvas.height = derive from plot values range (and clamping thereof?)
    blockDiv.appendChild(canvas);
    blockDiv.canvas = canvas;
    return blockDiv;
};

// CanvasTrack.prototype.reRenderBlock


CanvasTrack.canvas_test_colors = [ "#f00", "#0f0", "#00f" ];
CanvasTrack.canvas_render_count = 0;

/**
 *  force re-rendering of track
 *  block divs and block canvases are retained, 
 *      but each visible block canvas is redrawn
 *  WARNING: currently assumes height of track does not change
 */
CanvasTrack.prototype.renderTrack = function()  {
    var track = this;
    var view = track.gview;

    var pos = view.getPosition();
    var startX = pos.x - (view.drawMargin * view.dim.width);
    var endX = pos.x + ((1 + view.drawMargin) * view.dim.width);
    var leftVisible = Math.max(0, (startX / view.stripeWidth) | 0);
    var rightVisible = Math.min(view.stripeCount - 1,
				(endX / view.stripeWidth) | 0);

    var bpPerBlock = Math.round(view.stripeWidth / view.pxPerBp);

    var startBase = Math.round(view.pxToBp((leftVisible * view.stripeWidth) + view.offset));
    var containerStart = Math.round(view.pxToBp(view.offset));
    var containerEnd = Math.round(view.pxToBp(view.offset + (view.stripeCount * view.stripeWidth)));
    /*
      track.showRange(leftVisible, rightVisible,
		    startBase, bpPerBlock,
		    this.pxPerBp,
		    containerStart, containerEnd);
     */
    // porting relevant stuff from track.showRange
    if (this.blocks === undefined)  { return; }
    var first = leftVisible;
    var last = rightVisible;

    var firstAttached = (null == this.firstAttached ? last + 1 : this.firstAttached);
    var lastAttached =  (null == this.lastAttached ? first - 1 : this.lastAttached);

    var i, leftBase;
    var maxHeight = 0;
    var blockIndex;
    var blockDiv;
    //fill left, including existing blocks (to get their heights)
    for (i = lastAttached; i >= first; i--) {
        leftBase = startBase + (bpPerBlock * (i - first));
        // this._showBlock(i, leftBase, leftBase + bpPerBlock, scale,
	//                        containerStart, containerEnd);
	// porting relevant stuff from track._showBlock
	blockDiv = this.blocks[i];
	if (blockDiv)  {
	    if (this.loaded) {
		this.fillBlock(i, 
			       blockDiv,
			       this.blocks[i - 1],
			       this.blocks[i + 1],
			       leftBase, // startBase,
			       leftBase + bpPerBlock, // endBase,
			       view.pxPerBp, // scale,
			       this.widthPx,
			       containerStart,
			       containerEnd);
	    } else {
		this._loadingBlock(blockDiv);
	    }
	}
    }
    //fill right
    for (i = lastAttached + 1; i <= last; i++) {
        leftBase = startBase + (bpPerBlock * (i - first));
	//        this._showBlock(i, leftBase, leftBase + bpPerBlock, scale,
	//                        containerStart, containerEnd);
	blockDiv = this.blocks[i];
	if (blockDiv)  {
	    if (this.loaded) {
		this.fillBlock(i, 
			       blockDiv,
			       this.blocks[i - 1],
			       this.blocks[i + 1],
			       leftBase, // startBase,
			       leftBase + bpPerBlock, // endBase,
			       view.pxPerBp, // scale,
			       this.widthPx,
			       containerStart,
			       containerEnd);
	    } else {
		this._loadingBlock(blockDiv);
	    }
	}
    }
};

/**
 * CanvasTrack.fillBlock does NOT use:
 *    containerStart, 
 *    containerEnd,
 *    leftBlock,
 *    rightBlock, 
 * These args are kept for consistency with Track.fillBlock signature
 */
CanvasTrack.prototype.fillBlock = function(blockIndex, blockDiv,
					   leftBlock, rightBlock,
					   leftBase, rightBase,
					   scale, stripeWidth,
					   containerStart, containerEnd) {
    var track = this;
    track.renderer.drawBlock(track, blockIndex, blockDiv, leftBlock, rightBlock, leftBase, rightBase, 
			     scale, stripeWidth, containerStart, containerEnd);
};


CanvasTrack.prototype.endZoom = function(destScale, destBlockBases)  {
    // console.log("CanvasTrack.endZoom called");
    Track.prototype.endZoom.call(this, destScale, destBlockBases);
    Track.prototype.clear.call(this);
};

CanvasTrack.prototype.moveBlocks = function(delta)  {
    Track.prototype.moveBlocks.call(this, delta);
    /*
      var canvas = blockDiv.canvas;
      var context = canvas.getContext("2d"); 
      context.fillStyle = "#ffd";
      context.fillRect(10, 24, 100, 12);
      context.fillStyle = "#000";
      context.fillText("scale = " + scale + ", stripeWidth = " + stripeWidth, 10, 24);
    */    
};


CanvasTrack.prototype.loadSuccess = function(o) {
    console.log("called CanvasTrack.loadSuccess");

    //tileWidth: width, in pixels, of the tiles
    //    this.tileWidth = o.tileWidth;
    //zoomLevels: array of {basesPerTile, scale, height, urlPrefix} hashes
    //  this.zoomLevels = o.zoomLevels;

    // just testing that trackData info gets handled correctly
    this.testvar = o.testvar;
    this.testvar2 = o.testvar2;
    console.log("testvar2: " + o.testvar2);
    this.setLoaded();
};
