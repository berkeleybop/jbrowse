
/**
 * to simplify for now, assume leaf data points are entirely populated, 
 *    flat leaf array x/y is passed in as coords/scores args to WigStack constructor
 * for now, base WigStack zoom levels on GenomeView.zoomLevels
 * assumes coords and scores arrays are sorted by coords
 * assumes all coords are on same seq
 */
function WigStack(coords, scores, zoomLevels)  {
    console.log("called WigStack constructor");
    this.zoomLevels = zoomLevels;
    this.coords = coords;
    this.scores = scores;
    this._buildTree();
    console.log("end of WigStack constructor");
}

WigStack.prototype._buildTree = function()  {
    /** sumLevels is array with entry for each zoom level of lower resolution (> bases/pixel) than 
     *    the average values/pixel of the base xy plot
     *   entries into array are scaled summaries
     *   scaled_summary = {
     *      pixelsPerBase:
     *      basesPerPixel:
     *      binStarts:  array of start of each bin
     *      binEnds:  array of end of each bin
     *      minScores: array of min score for each bin
     *      maxScores: array of max score for each bin
     *      avgScores: array of avg score for each bin
     *      countScores:   array of scored position count for each bin
     */
    this.sumLevels = [];
    var coords = this.coords;
    var scores = this.scores;
    var zoomLevels = this.zoomLevels;

    var avgBasesPerVal = (coords[coords.length-1] - coords[0]) / coords.length;
    /*
    console.log("zoomLevels:");
    console.log(zoomLevels);
    console.log("total data points: " + coords.length);
    console.log("average bases per data point: " + avgBasesPerVal);
*/
    // for each zoom level where bases_per_pixel > avg_bases_data_point, 
    //    compute scaled_summary info per bin (restrict bins to span of the coords though)
    //    bin size is bases_per_pixel
    //    only create bin for slot if there are data points within that range
    //    (implies can't figure out position of bin by index, so need to keep at least binMins array 
    for (var zlevel = 0; zlevel < zoomLevels.length; zlevel++)  {

	var pixelsPerBase = zoomLevels[zlevel];
	var basesPerPixel = 1.0/pixelsPerBase;
	// console.log("bases per pixel: " + basesPerPixel);
	if (basesPerPixel < 4)  {   // for now, only calc summaries for levels 4 bases/pixel or denser
	    this.sumLevels[zlevel] = null;   // set sumLevel = null if not calculating summaries
	    continue; 
	}  
	
	var level = {};
	// basesPerPixel = Math.ceiling(basesPerPixel);
	level.pixelsPerBase = pixelsPerBase;
	level.basesPerPixel = basesPerPixel;

	// using half-open coord system
	//    binMin is included in bin (open), binMax is not (closed)
	//    doing this way so every data point falls in only one bin
	var binMins = [];
	var binMaxs = [];
	var minScores = [];
	var maxScores = [];
	var avgScores = [];
	var countScores = [];

	var lastindex = coords.length - 1;
	var curBinMin = -1;
	var curBinMax = -1;  // coord will always be >= 0, so forcing new bin initialization for first data point
	var bindex = -1;
	var min, max, sum, count;

	for (var sindex=0; sindex <= lastindex; sindex++)  {
	    var pos = coords[sindex];
	    var score = scores[sindex];
	    if (pos >= curBinMax)  {
		// close previous bin
		if (bindex > -1)  {
		    minScores[bindex] = min;
		    maxScores[bindex] = max;
		    avgScores[bindex] = sum / count;
		    countScores[bindex] = count;
		}

		// initialize new bin (unless at lastindex), figure out which slot pos falls in
		if (sindex != lastindex)  {
		    bindex++;
		    curBinMin = (Math.floor(pos / basesPerPixel)) * basesPerPixel;
		    curBinMax = curBinMin + basesPerPixel;
		    binMins[bindex] = curBinMin;
		    binMaxs[bindex] = curBinMax;
		    min = score;
		    max = score;
		    sum = score;
		    count = 1;
		}
	    }
	    else  {
		if (score < min)  { min = score; }
		if (score > max)  { max = score; }
		sum += score;
		count++;
	    }
	}
	level.pixelsPerBase = pixelsPerBase;
	level.basesPerPixel = basesPerPixel;
	level.binMins = binMins;
	level.binMaxs = binMaxs;
	level.minScores = minScores;
	level.maxScores = maxScores;
	level.avgScores = avgScores;
	level.countScores = countScores;
	this.sumLevels[zlevel] = level;
    }
    
};


