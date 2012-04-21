function HeatMap_Renderer()  {  }

HeatMap_Renderer.NAME = "HeatMap";
HeatMap_Renderer.ID = "HeatMap";

HeatMap_Renderer.setupColors = function()  {
    HeatMap_Renderer.colors = new Array();
    for (var i=0; i<256; i++)  {
	if (i < 240)  {
	    var col = "#"+(255-i).toString(16)+(255-i).toString(16)+(255-i).toString(16);
	}
	else  {
	    var col = "#0"+(255-i).toString(16)+"0"+(255-i).toString(16)+"0"+(255-i).toString(16);
	}
	//	console.log("index: " + i + ", color: " + col);
	HeatMap_Renderer.colors.push(col);
    }
}

HeatMap_Renderer.setupColors();

CanvasTrack.registerRenderer(HeatMap_Renderer);

HeatMap_Renderer.drawBlock = function (track, blockIndex, blockDiv,
					     leftBlock, rightBlock,
					     leftBase, rightBase,
					     scale, stripeWidth,
					     containerStart, containerEnd) {
    if (CanvasTrack.VERBOSE_RENDER) {  console.log("called HeatMap_Renderer.drawBlock");  }

    var colors = HeatMap_Renderer.colors;
//    console.log("HeatMap Renderer colors");
//    console.log(colors);
    
    var mindex = track.getCoordIndex(leftBase);
    var maxdex = track.getCoordIndex(rightBase) + 1;
    if (maxdex >= track.locs.length)  { maxdex = track.locs.length-1; }
    
   //  console.log("mindex = " + mindex + ", coord = " + track.locs[mindex] + ", score = " + track.scores[mindex]);
   //  console.log("maxdex = " + maxdex + ", coord = " + track.locs[maxdex] + ", score = " + track.scores[maxdex]);
    

    // scale is in units of pixels per base
    // stripeWidth is in pixels
    // based on $(canvas).width() and $(blockDiv).width(), block div and canvas not yet 
    //     set to actual dimensions??
    // but stripeWidth appears accurate, so relying on it...
    var pixels_per_base = scale;
    var bases_per_pixel = 1.0/scale;
//    console.log("bases per pixel: " + bases_per_pixel);
    // find sumLevel
    var levels = track.wstack.sumLevels;
    var lcount = levels.length;
    var level = null;
    // need to switch to finding nearest level, rather than exact level???
    for (var lindex = 0; lindex<lcount; lindex++)  {
	var curlevel = levels[lindex];
	if (curlevel && (curlevel.pixelsPerBase == pixels_per_base)) {
	    level = curlevel;
	    break;
	}
    }
    if (level)  {
//	console.log("found level:");
//	console.log(level);
    }

    var canvas = blockDiv.canvas;
    canvas.height = 100; 
    canvas.width = stripeWidth;
    var context = canvas.getContext("2d"); 
    context.clearRect(0,0,canvas.width,canvas.height);
    //  console.log("pixels per base: " + pixels_per_base + ", bases per pixel: " + bases_per_pixel);
    if (CanvasTrack.VERBOSE_RENDER)  {
	console.log("stripeWidth: " + stripeWidth + ", end-start: " + (rightBase - leftBase) + ", block width: " + $(blockDiv).width());
	console.log("canvas coord width: " + canvas.width + ", canvas pixel width = " + $(canvas).width());
	console.log("containerStart: " + containerStart + ",  containerEnd: " + containerEnd);
    }

    // clear transform (set to identity matrix) just in case;
    context.setTransform(1,0,0,1,0,0);
    // scale first, then translate?
    // want to get 
    //    pixel_position = scale * (base_position - leftBase)

   //  var hscale = 100 / (track.maxviz-track.minviz);
    var hscale = canvas.height / (track.maxviz-track.minviz);
    // for scaling by minviz/maxviz, not clipping, won't be drawn if outside of canvas bounds anyway
    if (CanvasTrack.VERBOSE_RENDER)  { console.log("hscale: " + hscale); }
// not scaling canvas vertically, since heat map so every draw is for full height of canvas
//    context.scale(scale, hscale);
    context.scale(scale, 1.0);

    //    context.translate(-leftBase, 0);
    //    context.translate(-leftBase, (track.maxviz-100));
    

//context.translate(-leftBase, (track.maxviz-canvas.height));
    context.translate(-leftBase, 0);
    //  var col = CanvasTrack.canvas_test_colors[CanvasTrack.canvas_render_count % 3];
    //  context.fillStyle = col;
    //  CanvasTrack.canvas_render_count++;
    context.fillStyle = track.baseColor;

    
    var use_path = CanvasTrack.USE_PATH;
    if (use_path)  {
	context.beginPath();
    }
    if (pixels_per_base >= 1)  { // draw pixels_per_base wide
	if (CanvasTrack.VERBOSE_RENDER)  { console.log("drawing each point over multiple pixels"); }
	for (var index = mindex; index <= maxdex; index++)  {
	    var coord = track.locs[index];
	    var score = track.scores[index];
	    if (use_path)  {
		context.rect(coord, 100, 1, (score * -100));
		// context.rect(coord, 100, 1, (score * -1));
	    }
	    else  {
		context.fillRect(coord, 100, 1, (score * -100));
		// context.fillRect(coord, 100, 1, (score * -1));
	    }
	}
    }
    else  { 	// draw 1 pixel wide
	if (CanvasTrack.USE_LEVELS && level)  {  // current scale/zoom has a summary level, so render summary
	    mindex = track.getSumCoordIndex(leftBase, level);
//	    maxdex = track.getSumCoordIndex(rightBase, level) + 1;
	    maxdex = track.getSumCoordIndex(rightBase, level);
	    if (maxdex >= level.binMins.length)  { maxdex = level.binMins.length-1; }
	    var coords = level.binMins;
	    var mins = level.minScores;
	    var maxs = level.maxScores;
	    var avgs = level.avgScores;
	    var clength = coords.length;
	    var coord, min, max, avg;
	   //  console.log("mindex: " + mindex + ", coords length: " + coords.length);
	   //  console.log("score: " + coords[mindex]);

	    var dcount = 0;

//	    context.fillStyle = track.baseColor;
	    for (var index = mindex; index <= maxdex; index++) {
		if (index >= clength || index < 0)  { console.log("exceeded plot data bounds"); }
		coord = coords[index];
		avg = avgs[index];
		// if (min && max)  {
		if (coord == undefined || avg == undefined)  {  // skip edge cases where avg is undefined...
		    console.log("coord = " +  coord + ", avg = " + avg);
		}
		else  {
		    // calc saturation based on minviz = 0, maxviz = 1;
		    var colorscale = ((avg * 100) - track.minviz) / (track.maxviz - track.minviz);
		    var cindex;
		    if (colorscale > 1.0)  { cindex = 255; }
		    else if (colorscale < 0)  { cindex = 0; }
		    else  { cindex = Math.floor(colorscale * 255); }
		    // only draw if will see
		    if (cindex != 0)  {
			/* if (dcount++ < 4)  {
			    console.log("avg: " + avg + ", maxviz: " + track.maxviz + ", minviz: " + track.minviz);
			    console.log("colorscale: " + colorscale);
			    console.log("setting fillstyle to: " + cindex + ", " + colors[cindex]);			    
			} */
			context.fillStyle = colors[cindex];
			context.fillRect(coord, 100, bases_per_pixel, -100);
		    }
		}
	    }
	}
	else  {  // no summary level for current scale/zoom, so render actual scores
	    var coords = track.locs;
	    var scores = track.scores;
	    var clength = coords.length;
	    for (var index = mindex; index <= maxdex; index++)  {
		if (index >= clength || index < 0)  { console.log("exceeded plot data bounds"); }
		var coord = coords[index];
		var score = scores[index];
		// if (score)  {  // skip edge cases where score is undefined...
		    if (use_path)  {
			context.rect(coord, 100, bases_per_pixel, (score * -100));
		    }
		    else  {
			context.fillRect(coord, 100, bases_per_pixel, (score * -100));
		    }
		//   }
	    }
	}
    }
    if (use_path)  {
	context.fill();
	context.closePath();
    }
    //  context.fillStyle = "#000";
    //  context.fillRect(leftBase + (4 * bases_per_pixel), 0, -2 * bases_per_pixel, 100);
    //  context.fillRect(rightBase - (4 * bases_per_pixel), 0, 2 * bases_per_pixel, 100);
    track.heightUpdate(100, blockIndex);

};