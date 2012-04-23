// MODEL

/**

Nested containment list.

@class

After
<pre>
  Alekseyenko, A., and Lee, C. (2007).
  Nested Containment List (NCList): A new algorithm for accelerating
     interval query of genome alignment and interval databases.
  Bioinformatics, doi:10.1093/bioinformatics/btl647
</pre>

<a href="http://bioinformatics.oxfordjournals.org/cgi/content/abstract/btl647v1">http://bioinformatics.oxfordjournals.org/cgi/content/abstract/btl647v1</a>

 */

/**
*  When JSON data structures changed (from version 1.2.1 to ?? in March 2012), 
*  NCList() also changed how lazy data loading is handled
*  instead of insertion of lazily loaded sublist into intervals data struct (as in 1.2.1), now 
*  keep track of lazy-loaded sublists via a lazyChunks object, where lazyChunks[chunkId] maps to sublist for that chunk
* 
* For example:
* Jbrowse 1.2.1:
*   trackInfo (trackData): lazyIndex = 2, sublistIndex = 6
* pre-load intervals feat:
*   [ start, end, { chunk : chunkId } ]
* post-load:
*   [start, end, { chunk : chunkId, state : "loaded" }, null, null, null, [ LOADED_SUBLIST ]
* and operations that recurse into lazy-loaded sublists (once loaded) 
* get to them  through lazyfeat[sublistIndex]
* 
* New JBrowse (> 1.2.1)
* trackData: lazyClass = 4,
*            classes[4] = { "Start", "End", "Chunk" }  // class as 0 index of actual entry is implicit
* pre-load:
*    [ 4, start, end, chunkId ]
*    lazyChunks[chunkId] = undefined
* post-load
*    [ 4, start, end, chunkId ]  // intervals struct is unchanged
*    lazyChunks[chunkId] = { state : "loaded", data : [LOADED_SUBLIST] }
* 
*  and operations that recurse into lazy-loaded sublists (once loaded) 
*  get to them through lazychunks[lazyfeat[chunkId]].data
*  get to them through lazychunks[atts.get(lazyfeat, "Chunk")].data
*  (this implies "Chunk" field values are unique within this NCList)
*
*/
function NCList() {
    this.featIdMap = {};
    this.topList = [];
}

NCList.prototype.importExisting = function(nclist, attrs, baseURL,
                                           lazyUrlTemplate, lazyClass) {
    this.topList = nclist;
    this.attrs = attrs;
    this.start = attrs.makeFastGetter("Start");
    this.end = attrs.makeFastGetter("End");
    this.lazyClass = lazyClass;
    this.baseURL = baseURL;
    this.lazyUrlTemplate = lazyUrlTemplate;
    this.lazyChunks = {};
};


/**
 *  DO NOT USE directly for adding additional intervals!
 *  erases current topList and subarrays, repopulates from intervals
 *  if need to add additional intervals, use multiple calls to NCList.add() 
 *        (n calls to add is very inefficient though: O(n^2) ?)
 */
NCList.prototype.fill = function(intervals, attrs) {
    //intervals: array of arrays of [start, end, ...]
    //attrs: an ArrayRepr object
    //half-open?
    if (intervals.length == 0) {
        this.topList = [];
        return;
    }

    this.attrs = attrs;
    this.start = attrs.makeFastGetter("Start");
    this.end = attrs.makeFastGetter("End");
    var setSublist = attrs.makeSetter("Sublist");
    var start = this.start;
    var end = this.end;
    var myIntervals = intervals;
    //sort by OL
    myIntervals.sort(function(a, b) {
        if (start(a) != start(b))
            return start(a) - start(b);
        else
            return end(b) - end(a);
    });

    var sublistStack = new Array();
    var curList = new Array();
    this.topList = curList;
    curList.push(myIntervals[0]);
    if (myIntervals.length == 1) return;
    var curInterval, topSublist;
    for (var i = 1, len = myIntervals.length; i < len; i++) {
        curInterval = myIntervals[i];
        //if this interval is contained in the previous interval,
        if (end(curInterval) < end(myIntervals[i - 1])) {
            //create a new sublist starting with this interval
            sublistStack.push(curList);
            curList = new Array(curInterval);
            setSublist(myIntervals[i - 1], curList);
        } else {
            //find the right sublist for this interval
            while (true) {
                if (0 == sublistStack.length) {
                    curList.push(curInterval);
                    break;
                } else {
                    topSublist = sublistStack[sublistStack.length - 1];
                    if (end(topSublist[topSublist.length - 1])
                        > end(curInterval)) {
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

NCList.prototype.binarySearch = function(arr, item, getter) {
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

NCList.prototype.iterHelper = function(arr, from, to, fun, finish,
                                       inc, searchGet, testGet, path) {
    var len = arr.length;
    var i = this.binarySearch(arr, from, searchGet);
    var getChunk = this.attrs.makeGetter("Chunk");
    var getSublist = this.attrs.makeGetter("Sublist");

    while ((i < len)
           && (i >= 0)
           && ((inc * testGet(arr[i])) < (inc * to)) ) {

        if (arr[i][0] == this.lazyClass) {
            var ncl = this;
            var chunkId = getChunk(arr[i]);
            if (!(chunkId in this.lazyChunks)) {
                this.lazyChunks[chunkId] = {};
            }
            var chunk = this.lazyChunks[chunkId];
            finish.inc();
	    // call to maybeLoad will set chunk.data to lazy-loaded sublist once loaded, 
	    //     and call iterHelper on sublist
	    // if lazy-load data already loaded ( chunk.state = loaded ), maybeLoad() 
	    //     will just immediately call iterHelper on sublist (chunk.data)
            Util.maybeLoad({ url: Util.resolveUrl(this.baseURL,
                                           this.lazyUrlTemplate.replace(
                                                   /\{Chunk\}/ig, chunkId
                                           ) ),
                             handleAs: 'json'
                           },
                           chunk,
                           (function (myChunkId) {
                               return function(o) {
                                   ncl.iterHelper(o, from, to, fun, finish,
                                                  inc, searchGet, testGet,
                                                  [myChunkId]);
                                   finish.dec();
                               };
                            })(chunkId),
                           function() {
                               finish.dec();
                           }
                          );
        } else {
            fun(arr[i], path.concat(i));
        }

        var sublist = getSublist(arr[i]);
        if (sublist)
            this.iterHelper(sublist, from, to,
                            fun, finish, inc, searchGet, testGet,
                            path.concat(i));
        i += inc;
    }
};

NCList.prototype.iterate = function(from, to, fun, postFun) {
    // calls the given function once for each of the
    // intervals that overlap the given interval
    //if from <= to, iterates left-to-right, otherwise iterates right-to-left

    //inc: iterate leftward or rightward
    var inc = (from > to) ? -1 : 1;
    //searchGet: search on start or end
    var searchGet = (from > to) ? this.start : this.end;
    //testGet: test on start or end
    var testGet = (from > to) ? this.end : this.start;
    var finish = new Finisher(postFun);

    //  GAH newJSON merge notes
    //  don't understand change in GMOD of path arg from [] (in prior versions) to [0] ???
    //     is it to deal with same issue that is fixed in berkeleybop by: if (this.topList.length > 0) 
    //     if so, eliminate one or the other ?? -- currently doing both in merge
    //  
    // berkeleybop/jbrowse:master
    //  if (this.topList.length > 0) {
    //        this.iterHelper(this.topList, from, to, fun, finish,
    //                        inc, searchIndex, testIndex, []);
    //    }
    //
    // GMOD/jbrowse:master
    //    this.iterHelper(this.topList, from, to, fun, finish,
    //                    inc, searchGet, testGet, [0]);

    if (this.topList.length > 0) {
	this.iterHelper(this.topList, from, to, fun, finish,
			inc, searchGet, testGet, [0]);
    }
    finish.finish();
};

NCList.prototype.histogram = function(from, to, numBins, callback) {
    //calls callback with a histogram of the feature density
    //in the given interval

    var result = new Array(numBins);
    var binWidth = (to - from) / numBins;
    var start = this.start;
    var end = this.end;
    for (var i = 0; i < numBins; i++) result[i] = 0;
    this.iterate(from, to,
                 function(feat) {
	             var firstBin =
                         Math.max(0, ((start(feat) - from) / binWidth) | 0);
                     var lastBin =
                         Math.min(numBins, ((end(feat) - from) / binWidth) | 0);
	             for (var bin = firstBin; bin <= lastBin; bin++)
                         result[bin]++;
                 },
                 function() {
                     callback(result);
                }
                 );
};

/*
 NCList.prototype.setSublistIndex = function(index) {
    if (this.sublistIndex === undefined) {
        this.sublistIndex = index;
    } else {
        throw new Error("sublistIndex already set; can't be changed");
    }
};
*/

/* 
 * WARNING: to use NCList.add(), 
 *    MUST have all features for the track (on the current sequence) already loaded!!
 * Otherwise:
 *    1. calling add() will force lazy loading of any features not already loaded
 *           due to iterate(-Infinity, Infinity) call
 *    2. NCList rebuilding will likely be incomplete, 
 *           because featArray after iterate is called may not include all the lazy loaded features, 
 *           since adding those features to featArray is handled asynchronously
 */
NCList.prototype.add = function(feat, id) {
    if (this.verbose)  {
	console.log("NCList.add() called, id: " + id);
	console.log(feat);
    }
    var getSublist = this.attrs.makeGetter("Sublist");
    var setSublist = this.attrs.makeSetter("Sublist");
    var featArray = [feat];
    this.iterate(-Infinity, Infinity, function(f) { featArray.push(f); });
    /* remove any sublist structure, this needs to be rebuilt in fill() */
    for (var i = 0; i < featArray.length; i++) {
	var otherfeat = featArray[i];
	if (getSublist(otherfeat))  {
	    setSublist(otherfeat, null);
	}
    }

    this.fill(featArray, this.attrs);
    this.featIdMap[id] = feat;
};


/* 
 * WARNING: to use NCList.deleteEntry, 
 *    MUST have all features for the track (on the current sequence) already loaded!!
 * Otherwise:
 *    1. calling add() will force lazy loading of any features not already loaded
 *           due to iterate(-Infinity, Infinity) call
 *    2. NCList rebuilding will likely be incomplete, 
 *           because featArray after iterate is called may not include all the lazy loaded features, 
 *           since adding those features to featArray is handled asynchronously
 */
NCList.prototype.deleteEntry = function(id) {
    var featToDelete = this.featIdMap[id];
    if (this.verbose)  {
	console.log("NCList.deleteEntry() called, id: " + id);
	console.log(featToDelete);
    }
    if (featToDelete) {
	var getSublist = this.attrs.makeGetter("Sublist");
	var setSublist = this.attrs.makeSetter("Sublist");
        var featArray = [];
        this.iterate(-Infinity, Infinity,
                     function(feat) {
                         if (feat !== featToDelete) featArray.push(feat);
                     });
	/* remove any sublist structure, this needs to be rebuilt in fill() */
        for (var i = 0; i < featArray.length; i++) {
	    var otherfeat = featArray[i];
	    if (getSublist(otherfeat))  {
		setSublist(otherfeat, null);
	    }
        }
        // delete featToDelete;  // deleting featToDelete doesn't delete entry in featIdMap, must be explicit
	delete this.featIdMap[id];
	this.fill(featArray, this.attrs);
    } else {
        throw new Error("NCList.deleteEntry: id " + id + " doesn't exist");
    }
};

/*  as of 2/2012, contains() (and therefore featIdMap) only used by AnnotTrack
 *     may want to push out to AnnotTrack, since populating featIdMap only happens in add(), 
 *        and most NCList construction doesn't call add() (exception is AnnotTrack)
 *     alternatively, make sure featIdMap is populated for every feature in NCList 
 *        (would require featIdMap[] assignment in fill(), importExisting(), and lazy loading in iterHelper() ?
 *            possibly elsewhere too? )
 */
NCList.prototype.contains = function(id)  {
    return (!!this.featIdMap[id]);  
};


/*

Copyright (c) 2007-2009 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
