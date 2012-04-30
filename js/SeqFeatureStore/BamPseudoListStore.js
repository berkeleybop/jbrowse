var SeqFeatureStore; if( !SeqFeatureStore) SeqFeatureStore = function() {};

/**
 * Implementation of SeqFeatureStore that accesses data from BAM file and BAI index, 
 *      uses pseudo nested containment 
 *      lazy-loading of chunks of BAM data
 * 
 * Uses ../BamPsudeoNCList.js as internal NCList
 *
 * @class
 * @extends SeqFeatureStore
 */
SeqFeatureStore.BamPseudoListStore = function(args) {
    SeqFeatureStore.call( this, args );
    if( !args )
        return;
    this.baseUrl = args.baseUrl;
    this.refSeq = args.refSeq;
    this.track = args.track;
    this.config = args.config;
};

SeqFeatureStore.NCList.prototype = new SeqFeatureStore();

/**
 *  "url" arg is present to preserve load signature, but 
 *  index and datafile URLs are actually pulled from trackMeta
 *  currently "url" arg passed is undefined
 */
SeqFeatureStore.BamPseudoListStore.prototype.load = function() {
    console.log("called BamFeatureTrack.load()");  
    var trackMeta = this.config;
    var bamurl = Util.resolveUrl(trackMeta.sourceUrl, trackMeta.data_url);
    var baiurl = Util.resolveUrl(trackMeta.sourceUrl, trackMeta.index_url);
    console.log("bam file " + bamurl);
    console.log("bai file " + baiurl);
    var bamfetch = new URLFetchable(bamurl);
    var baifetch = new URLFetchable(baiurl);
    console.log("built bam and bai URLFetchables");
    // var curTrack = this;
    var bamstore = this;
    makeBam(bamfetch, baifetch, function(bamfile) {    // makeBam in global namespace, from dalliance/js/bam.js
		bamstore.loadSuccess(bamfile);
	    } );  
    // equivalent??: makeBam(bamfetch, baifetch, curTrack.loadSuccess);
    console.log("makeBam called");
};

/* NOT YET IMPLEMENTED */
SeqFeatureStore.BamPseudoListStore.prototype.loadSuccess = function( bamfile) {

};

SeqFeatureStore.BamPseudoListStore.prototype.loadFail = function(trackInfo,url) {
    this.empty = true;
    this.setLoaded();
};

// just forward histogram() and iterate() to our encapsulate nclist
//SeqFeatureStore.BamPseudoListStore.prototype.histogram = function() {
//    return this.nclist.histogram.apply( this.nclist, arguments );
//};


SeqFeatureStore.BamPseudoListStore.prototype.iterate = function( startBase, endBase, origFeatCallback, finishCallback ) {
    var that = this;
    var accessors = this.attrs.accessors(),
        /** @inner */
        featCallBack = function( feature, path ) {
            that._add_getters( accessors.get, feature );
            return origFeatCallback( feature, path );
        };
    return this.nclist.iterate.call( this.nclist, startBase, endBase, featCallBack, finishCallback );
};

// helper method to recursively add a .get method to a feature and its
// subfeatures
SeqFeatureStore.BamPseudoListStore.prototype._add_getters = function(getter,feature) {
    var that = this;
    feature.get = getter;
    dojo.forEach( feature.get('subfeatures'), function(f) { that._add_getters( getter, f ); } );
};

