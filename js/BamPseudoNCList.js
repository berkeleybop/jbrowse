//After
//Alekseyenko, A., and Lee, C. (2007).
//Nested Containment List (NCList): A new algorithm for accelerating
//   interval query of genome alignment and interval databases.
//Bioinformatics, doi:10.1093/bioinformatics/btl647
//http://bioinformatics.oxfordjournals.org/cgi/content/abstract/btl647v1

/**
 *   NOT a true NCList!
 *   constructor also fills function that importExisting does for NCList
 */
function BamPseudoNCList(bamfile, refSeq, attrs) {
    this.make_cigar_subfeats = true;
    // bamfile is a BamFile from dalliance/js/bam.js, includes both bam and bai fetchables etc.
    this.bamfile = bamfile;
    this.refSeq = refSeq;
    this.attrs = attrs;
    this.start = attrs.makeFastGetter("Start");
    this.end = attrs.makeFastGetter("End");
    this.getId = attrs.makeGetter("Id");
    this.getChunk = this.attrs.makeGetter("Chunk");
    this.getSublist = this.attrs.makeFastGetter("Sublist");
    this.setSublist = this.attrs.makeFastSetter("Sublist");

    this.lazyClass = BamUtils.lazyClass;
//    this.lazyIndex = BamUtils.lazyIndex;
//    this.sublistIndex = BamUtils.sublistIndex;

    this.topList = [];
    // for now make topList an array of lazy-load chunks, each of length chunk_size
    //   like NCList, if iterate() touches lazy-load chunk, will trigger loading (but via bamfile rather than urltemplate)
    var chunk_size = 1000;
    //    var maxindex = Math.ceil(this.refLength / chunk_size);
    // var maxindex = Math.ceil(this.refSeq.end / chunk_size);
    console.log("refSeq start: ", refSeq.start, ", end: ", refSeq.end, " length: ", refSeq.length);
    if ((refSeq.end - refSeq.start) !== refSeq.length) {  console.log("ERROR!!! refseq length disagrees with start/end, end-start: ", (refSeq.end - refSeq.start)); }

    var chunk_min;
    var chunk_max = Math.floor(refSeq.start / chunk_size) * chunk_size;
    while (chunk_max < refSeq.end) { 
	chunk_min = chunk_max;
	chunk_max = chunk_min + chunk_size;
	if (chunk_max > this.refSeq.end) { chunk_max = this.refSeq.end; }
	// includes empty Object at chunk[lazyIndex] to indicate it's a "fake" lazy loading feature
	var chunk = [ this.lazyClass, chunk_min, chunk_max, {} ]; 
	this.topList.push(chunk);
    }
    // console.log("lazy chunks: " + this.topList.length);
    //    console.log("last min: ", chunk_min, ", max: ", chunk_max, ", max-end:", (chunk_max-refSeq.end));
};

// BamPseudoNCList.prototype.importExisting   // similar functionality merged into constructor

/**
 *  nearly identical to NCList.fill(), 
 *    but for populating any level in the nested list structure 
 *        assumes all intervals overlap/are contained in parent_list arg
 *        assumes parent_list sublistIndex is empty (replaces it)
 *        assumes interval[0] = min, interval[1] = max
 *  NOT for appending!
 *  erases current topList and subarrays, repopulates from intervals
 */
BamPseudoNCList.prototype.makeSubLists = function(intervals, parent_list)  {
              // , sublistIndex) {
    //intervals: array of arrays of [start, end, ...]
    //sublistIndex: index into a [start, end] array for storing a sublist
    //              array. this is so you can use those arrays for something
    //              else, and keep the NCList bookkeeping from interfering.
    //              That's hacky, but keeping a separate copy of the intervals
    //              in the NCList seems like a waste (TODO: measure that waste).
    //half-open?
    // this.sublistIndex = sublistIndex;
    var start = this.start;
    var end = this.end;
//    var sublistIndex = this.sublistIndex;
    if (intervals.length == 0) {
	// parent_list[sublistIndex] = [];
	this.setSublist(parent_list, []);
        // this.topList = [];
        return;
    }
    var myIntervals = intervals;//.concat();
    //sort by OL
     myIntervals.sort(function(a, b) {
        if (start(a) != start(b))
            return start(a) - start(b);
        else
            return end(b) - end(a);
	/*
	if (a[0] != b[0])
            return a[0] - b[0];
        else
            return b[1] - a[1];
	 */
    });

    var sublistStack = new Array();
    var curList = new Array();
    //    this.topList = curList;
//    parent_list[sublistIndex] = curList;
    this.setSublist(parent_list, curList);

    curList.push(myIntervals[0]);
    if (myIntervals.length == 1) return;
    var curInterval, topSublist;
    for (var i = 1, len = myIntervals.length; i < len; i++) {
        curInterval = myIntervals[i];
        //if this interval is contained in the previous interval,
        if (curInterval[1] < myIntervals[i - 1][1]) {
            //create a new sublist starting with this interval
            sublistStack.push(curList);
            curList = new Array(curInterval);
//            myIntervals[i - 1][sublistIndex] = curList;
            this.setSublist(myIntervals[i - 1], curList);
        } else {
            //find the right sublist for this interval
            while (true) {
                if (0 == sublistStack.length) {
                    curList.push(curInterval);
                    break;
                } else {
                    topSublist = sublistStack[sublistStack.length - 1];
                    if (topSublist[topSublist.length - 1][1] > curInterval[1]) {
                        //curList is the first (deepest) sublist that
                        //curInterval fits into
                        curList.push(curInterval);
                        break;
                    } else {
                        curList = sublistStack.pop();
                    }
                }
            }
        }
    }
};

BamPseudoNCList.prototype.binarySearch = function(arr, item, getter) {
    var low = -1;
    var high = arr.length;
    var mid;

    while (high - low > 1) {
        mid = (low + high) >>> 1;
        if (getter(arr[mid]) > item)
            high = mid;
        else
            low = mid;
    }

    //if we're iterating rightward, return the high index;
    //if leftward, the low index
    if (getter === this.end) return high; else return low;

};

BamPseudoNCList.prototype.iterHelper = function(arr, from, to, fun, finish,
                                       inc, searchGet, testGet, path)  {
    var ncl = this;
    var len = arr.length;

    var getSublist = ncl.getSublist;
    var i = ncl.binarySearch(arr, from, searchGet);
    while ((i < len)
           && (i >= 0)
           && ((inc * testGet(arr[i])) < (inc * to)) ) {
	var feat = arr[i];
	// var lazyField = feat[this.lazyIndex];
        // if ("object" == typeof lazyField) {
	// 
	// var lazyField = this.getChunk(feat);
	// if (getChunk(feat))  {
	if (feat[BamUtils.CINDEX] === ncl.lazyClass)  {
	    var lazyField = ncl.getChunk(feat);
	    var cmin = ncl.start(feat);
	    var cmax = ncl.end(feat);

            // lazy node
            if (lazyField.state) {
                if ("loading" == lazyField.state) {
                    // node is currenly loading; finish this query once it
                    // has been loaded
                    finish.inc();
                    lazyField.callbacks.push(
                        function(parentIndex) {
                            return function(o) {
                                ncl.iterHelper(o, from, to, fun, finish, inc,
                                               searchGet, testGet,
                                               path.concat(parentIndex));
                                finish.dec();
                            };
                        }(i)
                    );
                } else if ("loaded" == lazyField.state) {
                    // just continue below (at SUBLIST_ITERATE)
		    // (but not doing callback fun(feat), since feat  
		    //    is a "fake" feature meant to trigger lazy loading, rather than a real feature
                } else {
                    console.log("unknown lazy type: " + feat);
                }
            } else {
                // no "state" property means this node hasn't been loaded,
                // start loading
                lazyField.state = "loading";
                lazyField.callbacks = [];
                finish.inc();

		// this.bamfile.fetch(ncl.refSeq.name, bamMin, bamMax, 

		// making this bit a self-invoking function since need closure
		(function(parentIndex)  {
		     var lazyFeat = arr[parentIndex];
		     var lfield = ncl.getChunk(lazyFeat);
		     var chunkMin = ncl.start(lazyFeat);
		     var chunkMax = ncl.end(lazyFeat);

		     console.log("initiated loading of BAM chunk: " + chunkMin + " -- " + chunkMax);		     
		     ncl.bamfile.fetch(ncl.refSeq.name, chunkMin, chunkMax, 
			               function(bamrecords, error) {
					   // console.log("fetch returned for BAM chunk: " + chunkMin + " -- " + chunkMax);
					   if (error) { 
					       console.log("error loading BAM chunk: " + chunkMin + " -- " + chunkMax);
					       console.log(error);
					       finish.dec(); 
					   }
					   else {
					       // set state to "loaded"
					       // if (chunkMin != cmin)  { console.log("chunk starts don't match!  chunkMin = " + chunkMin + ", cmin = " + cmin); }
					       lfield.state = "loaded";

					       // create JBrowse JSON feats array from returned BAM records
					       var bamfeats = [];
					       var bamhash = { };
					       var idfield = BamUtils.ID;
					       var dups = [];
					       for (var bindex = 0; bindex < bamrecords.length; bindex++)  {
						   var record = bamrecords[bindex];
						   var bamfeat = BamUtils.convertBamRecord(record, ncl.make_cigar_subfeats);
						   // trying to catch case where get duplicate BAM records 
						   //    see issue 
						   // if (bamfeat[idfield] == "HWUSI-EAS594-R_0059:2:36:10569:14568#ACAGTG/294595-294695") {console.log("MATCH, record: " + bindex); }
						   if (bamhash[bamfeat[idfield]])  {
						       // console.log("filtered out identical bam feature: " + bamfeat[idfield]);
						       dups.push( bamfeat[idfield] );
						   }
						   else  {
						       bamhash[bamfeat[idfield]] = true;
						       bamfeats.push(bamfeat);
						   }
					       }
					       console.log("finished load of BAM chunk: " + chunkMin + " -- " + chunkMax + ", featcount: " + bamrecords.length);

					       if (dups.length > 0) { console.log("duplicate bam feature count: " + dups.length); console.log(dups); }
					       // console.log("loaded BAM feature count: " + bamrecords.length);
					       // console.log(bamhash);
					       // construct nested containment list array from JSON feats
					       //     (using modified NCList.fill() method
					       // populate lazyFeat[sublistIndex] with NCL array
					       ncl.makeSubLists(bamfeats, lazyFeat);
					       // var sublists = lazyFeat[ncl.sublistIndex];
					       var sublists = getSublist(lazyFeat);

					       // call iterHelper on newly created NCL sublist array
					       ncl.iterHelper(sublists, from, to,
							      fun, finish, inc,
							      searchGet, testGet,
							      path.concat(parentIndex));

					       // handle any callbacks that were postponed while loading was in progress
					       for (var c = 0; c < lfield.callbacks.length; c++) {
						   lfield.callbacks[c](sublists);
					       }

					       finish.dec();
					   }
				       } );
		 })(i);
            }
        } else {
            fun(feat, path.concat(i));
        }

	// SUBLIST_ITERATE: now if feat contain sublists, recurse into sublists
//        if (feat[this.sublistIndex])
//            this.iterHelper(feat[this.sublistIndex], from, to,
	if (getSublist(feat)) {
              ncl.iterHelper(getSublist(feat), from, to,
                            fun, finish, inc, searchGet, testGet,
                            path.concat(i));
	}
        i += inc;
    }  // END main while loop
};

BamPseudoNCList.prototype.iterate = function(from, to, fun, postFun) {
    // console.log("BamPseudoNCList.iterate() called, min = " + from + ", max = " + to + ", length = " + (to-from));
    // calls the given function once for each of the
    // intervals that overlap the given interval
    //if from <= to, iterates left-to-right, otherwise iterates right-to-left

    //inc: iterate leftward or rightward
    var inc = (from > to) ? -1 : 1;
    //searchIndex: search on start or end
//    var searchIndex = (from > to) ? 0 : 1;
    //testIndex: test on start or end
//    var testIndex = (from > to) ? 1 : 0;

    //searchGet: search on start or end
    var searchGet = (from > to) ? this.start : this.end;
    //testGet: test on start or end
    var testGet = (from > to) ? this.end : this.start;

    var finish = new Finisher(postFun);
    if (this.topList.length > 0) {
        this.iterHelper(this.topList, from, to, fun, finish,
                        inc, searchGet, testGet, []);
    }
    finish.finish();
};

/* NOT YET IMPLEMENTED */
BamPseudoNCList.prototype.histogram = function(from, to, numBins, callback) {
    //calls callback with a histogram of the feature density
    //in the given interval

    var result = new Array(numBins);
    var binWidth = (to - from) / numBins;
    for (var i = 0; i < numBins; i++) result[i] = 0;
    //this.histHelper(this.topList, from, to, result, numBins, (to - from) / numBins);
    this.iterate(from, to,
                 function(feat) {
	             var firstBin =
                         Math.max(0, ((feat[0] - from) / binWidth) | 0);
                     var lastBin =
                         Math.min(numBins, ((feat[1] - from) / binWidth) | 0);
	             for (var bin = firstBin; bin <= lastBin; bin++)
                         result[bin]++;
                 },
                 function() {
                     callback(result);
                }
                 );
};

// NOT NEEDED BamPseudoNCList.prototype.setSublistIndex = function(index) {
// NOT NEEDED: BamPseudoNCList.prototype.add = function(feat, id) {
// NOT NEEDED: NCList.prototype.deleteEntry = function(id)   {
// NOT NEEDED: NCList.prototype.contains = function(id)  {

