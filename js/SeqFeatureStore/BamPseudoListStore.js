// var SeqFeatureStore; if( !SeqFeatureStore) SeqFeatureStore = function() {};

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
function BamPseudoListStore(args) {
    SeqFeatureStore.call( this, args );
    if( !args )
        return;
    this.baseUrl = args.baseUrl;
    this.refSeq = args.refSeq;
    this.track = args.track;
    this.config = args.config;
};

BamPseudoListStore.prototype = new SeqFeatureStore();

BamPseudoListStore.prototype.load = function() {
    console.log("called BamFeatureTrack.load()");  
    var trackMeta = this.config;
    var bamfetch, baifetch;
    if (trackMeta.data_url && trackMeta.index_url)  {
	var bamurl = Util.resolveUrl(trackMeta.sourceUrl, trackMeta.data_url);
	var baiurl = Util.resolveUrl(trackMeta.sourceUrl, trackMeta.index_url);
	console.log("bam url " + bamurl);
	console.log("bai url " + baiurl);
	bamfetch = new URLFetchable(bamurl);
	baifetch = new URLFetchable(baiurl);
	console.log("built bam and bai URLFetchables");
    }
    else if (trackMeta.data_file && trackMeta.index_file) {
	console.log("bam file " + trackMeta.data_file);
	console.log("bai file " + trackMeta.index_file);
	bamfetch = new BlobFetchable(trackMeta.data_file);
	baifetch = new BlobFetchable(trackMeta.index_file);
	console.log("built bam and bai BlobFetchables");
    }

    else  {
	console.log("ERROR: track does not have URL or file info for bam and bai" );
	return;
    }

    // var curTrack = this;
    var bamstore = this;
    makeBam(bamfetch, baifetch, function(bamfile) {    // makeBam in global namespace, from dalliance/js/bam.js
		bamstore.loadSuccess(bamfile);
	    } );  
    // equivalent??: makeBam(bamfetch, baifetch, curTrack.loadSuccess);
    console.log("makeBam called");
};

BamPseudoListStore.prototype.loadSuccess = function( bamfile) {
    console.log("BamPseudoListStore.loadSuccess called");
    this.bamfile = bamfile;   // bamfile is a BamFile from dalliance/js/bam.js, 
    // now initialize BamPseudoNCList  
    this.nclist = new BamPseudoNCList(bamfile, this.refSeq, BamUtils.attrs);
    this.attrs = BamUtils.attrs;
// WARNING!  call to this.setLoaded is failing, attempts to call this.changed() but this is often not defined    
//    this.setLoaded();
    console.log("finished BamPseudoListStore.loadSuccess()");
};

BamPseudoListStore.prototype.loadFail = function(trackInfo,url) {
    this.empty = true;
    this.setLoaded();
};

// just forward histogram() and iterate() to our encapsulate nclist
//BamPseudoListStore.prototype.histogram = function() {
//    return this.nclist.histogram.apply( this.nclist, arguments );
//};


BamPseudoListStore.prototype.iterate = function( startBase, endBase, origFeatCallback, finishCallback ) {
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
BamPseudoListStore.prototype._add_getters = function(getter,feature) {
    var that = this;
    feature.get = getter;
    dojo.forEach( feature.get('subfeatures'), function(f) { that._add_getters( getter, f ); } );
};

