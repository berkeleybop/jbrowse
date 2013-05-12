define( [
            'dojo/_base/declare',
            'jquery',
            'jqueryui/draggable',
            'jqueryui/droppable',
            'jqueryui/resizable', 
            'dijit/Menu',
            'dijit/MenuItem', 
            'dijit/MenuSeparator', 
            'dijit/PopupMenuItem',
            'dijit/form/Button', 
            'dijit/form/DropDownButton',
            'dijit/DropDownMenu',

            'dijit/Dialog', 
            'dojox/grid/DataGrid', 
            'dojo/data/ItemFileWriteStore', 
            'WebApollo/View/Track/DraggableHTMLFeatures',
            'WebApollo/FeatureSelectionManager',
            'WebApollo/JSONUtils',
            'WebApollo/BioFeatureUtils',
            'WebApollo/Permission', 
            'WebApollo/SequenceSearch', 
            'JBrowse/Model/SimpleFeature',
    'JBrowse/Util', 
    'JBrowse/View/GranularRectLayout'
        ],
        function( declare, $, draggable, droppable, resizable, 
		  dijitMenu, dijitMenuItem, dijitMenuSeparator , dijitPopupMenuItem, dijitButton, dijitDropDownButton, dijitDropDownMenu, 
                  dijitDialog, dojoxDataGrid, dojoItemFileWriteStore, 
		  DraggableFeatureTrack, FeatureSelectionManager, JSONUtils, BioFeatureUtils, Permission, SequenceSearch, 
		  SimpleFeature, Util, Layout ) {

//var listeners = [];
//var listener;

/**
 *  Experimenting with client-side annotation editing and storage
 */

var creation_count = 0;

// var annot_context_menu;
// var contextMenuItems;

var context_path = "..";

// var non_annot_context_menu;

var LocalAnnotTrack = declare( DraggableFeatureTrack,
{
    constructor: function( args ) {
                //function AnnotTrack(trackMeta, url, refSeq, browserParams) {
	this.isWebApolloAnnotTrack = false;
        this.isWebApolloLocalAnnotTrack = true;
        this.has_custom_context_menu = true;
        this.exportAdapters = [];
        this.permission = 15;
        this.syncToCouchDB = true;

	this.selectionManager = this.setSelectionManager( this.webapollo.annotSelectionManager );

        this.selectionClass = "selected-annotation";
        this.annot_under_mouse = null;

        /**
         * only show residues overlay if "pointer-events" CSS property is supported
         *   (otherwise will interfere with passing of events to features beneath the overlay)
         */
        this.useResiduesOverlay = 'pointerEvents' in document.body.style;
        this.FADEIN_RESIDUES = false;

        var thisObj = this;

        this.annotMouseDown = function(event)  {
            thisObj.onAnnotMouseDown(event);
        };

        this.verbose_create = false;
        this.verbose_add = false;
        this.verbose_delete = true;
        this.verbose_drop = false;
        this.verbose_click = false;
        this.verbose_resize = false;
        this.verbose_mousedown = false;
        this.verbose_mouseenter = false;
        this.verbose_mouseleave = false;
        this.verbose_render = false;
        this.verbose_server_notification = false;

        var track = this;

        this.gview.browser.subscribe("/jbrowse/v1/n/navigate", dojo.hitch(this, function(currRegion) {
        	if (currRegion.ref != this.refSeq.name) {
        		if (this.listener && this.listener.fired == -1 ) {
        			this.listener.cancel();
        		}
        	}
        }));
        this.gview.browser.setGlobalKeyboardShortcut('[', track, 'scrollToPreviousEdge');
        this.gview.browser.setGlobalKeyboardShortcut(']', track, 'scrollToNextEdge');
    },

    _defaultConfig: function() {
	var thisConfig = this.inherited(arguments);
	// nulling out menuTemplate to suppress default JBrowse feature contextual menu
	thisConfig.menuTemplate = null;
	thisConfig.noExport = true;  // turn off default "Save track data" "
	thisConfig.style.centerChildrenVertically = false;
        thisConfig.couchDbRoot = "http://localhost:5984/";  // default to a local couchdb if no root specified in config
	return thisConfig;
    },
    
    setViewInfo: function( genomeView, numBlocks, trackDiv, labelDiv, widthPct, widthPx, scale ) {
        this.inherited( arguments );
	var track = this;
        var success = true;
	// var success = this.getPermission( function()  { track.initAnnotContextMenu(); });
        // calling back to initAnnotContextMenu() once permissions are returned by server
        /* getPermission call is synchronous, so login initialization etc. can be called anytime after getPermission call */
        track.initAnnotContextMenu();
//        this.initSaveMenu();
        this.initPopupDialog();
        if (success) {  track.initializePouch(); }

        if (success) {
            this.makeTrackDroppable();
            this.hide();
            this.show();
        }
        else {
            this.hide();
        }
    }, 

    initializePouch: function()  {
        console.log("initializing PouchDB");
        var track = this;

        // want to make compatible with CouchDB so can use same name for local PouchDB and remote CouchDB
        // CouchDB database name syntax:
        // Must begin with a lowercase letter, and then rest of name must be only:
        //         lowercase characters (a-z), 
        //         digits (0-9), 
        //         any of the characters _, $, (, ), +, -, and / 
        // For PouchDB, not totally clear on required database name syntax, but have already seen problems 
        //      with including "/"   (at least when trying _all_Dbs)
        //      therefore also avoiding "/",  
        // So for compatibility with CouchDB and PouchDB:
        //      convert uppercase to lowercase
        //      replace non-alphanumeric (including ".") with "-", EXCEPT for _, $, (, ), +, /

        //      replace "/" with "_"  
        //      using "-" to replace all other 

        var pouchDbName = "webapollo17_" + track.refSeq.name;
        pouchDbName = pouchDbName.toLowerCase();
        pouchDbName = pouchDbName.replace(/[^0-9a-z_\$\(\)\+\/]/, "-");
        pouchDbName = pouchDbName.replace(/\//, "_");  // replace "/" with "_" to avoid PouchDB issues with "/"
        var couchDbUrl = track.config.couchDbRoot + pouchDbName;
        console.log(pouchDbName);
        track.pouchDbName = pouchDbName;
        track.couchDbUrl = couchDbUrl;
        if (track.syncToCouchDB) {
            track.couchDbUrl = couchDbUrl;
            var allcouch = (CouchDB.allDbs("http://localhost:5984"));
            console.log("CouchB allDBS: ");
            console.log(allcouch);
            var couch_exists = $.inArray(pouchDbName, allcouch);
            console.log("couch exists: " + couch_exists);
            if ($.inArray(pouchDbName, allcouch) < 0)  {  
                // remote database not found on CouchDB server, so creating one

                console.log("COUCHDB database: " + pouchDbName + " not found, explicitly creating");

                if (window.localStorage && window.localStorage.last_change_seq)  {
                    window.localStorage.removeItem("last_change_seq");
                    console.log("clearing previous last_change_seq: " + window.localStorage.last_change_seq);
                }
                // create new couchdb database
                var remoteCouch = new CouchDB("http://localhost:5984/" + pouchDbName);
                // all CouchDB XHRs are _synchronous, so guaranteed wait till database created before proceeding
                var couch_created = remoteCouch.createDb();
                
                console.log("couchdb.createDb() result: ");
                console.log(couch_created);
            }
        }
        track.connectPouch();

    }, 


    connectPouch: function()  {
        console.log("called connectPouch");
        var track = this;
        var pouchDbName = track.pouchDbName;
        var couchDbUrl = track.couchDbUrl;

        Pouch.enableAllDbs = true;
        Pouch.allDbs( function(err, response) {
            if (err) {
                console.log("Couldn't get list of databases");
            }
            else {
                var allpouch = response;
                console.log("List of databases:");
                console.log(allpouch);
                if ($.inArray(pouchDbName, allpouch) < 0)  {  
                    console.log("PouchDB not found, will create new one");
                    if (window.localStorage && window.localStorage.last_change_seq)  {
                        window.localStorage.removeItem("last_change_seq");
                        console.log("clearing previous last_change_seq: " + window.localStorage.last_change_seq);
                    }
                }
                track.reallyConnectPouch();
            }
        });
    }, 

    reallyConnectPouch: function()  {
        var track = this;
        var pouchDbName = track.pouchDbName;
        var couchDbUrl = track.couchDbUrl;
        Pouch(pouchDbName, function(err, pouchdb) {
            if (err) {
                console.log("couldn't open pouchdb database");
                console.log(err);
            }
            else  {
                track.localdb = pouchdb;
                track.pouchdb = pouchdb;
                window.pouchdb = pouchdb;
                console.log("opened pouchdb: " );
                console.log(pouchdb);
                pouchdb.info(function(e,response) {
                    // update_seq SHOULD be seq num of last change, 
                    //  but appears to be a bug where not modified when changes are result of replicating process 
                    //     (when changes originate from remote database)
                    var db_update_seq = response.update_seq;  
                    
                    console.log(response);
                    console.log("db_update_seq: " + db_update_seq);
                    var actual_last_change;
                    //  hacking to make sure have actual last change, since change.seq seems to be more reliable than db_update_seq
                    //     note that the way changeMonitor is currently set up, would still work if use db_update_seq, just would 
                    //     potentially get onChange calls for redundant change events that are already reflected in initial 
                    //     track.getLocalFeatures() call
                    if (window.localStorage && window.localStorage.last_change_seq)  {
                        var last_change_seq = window.localStorage.last_change_seq;
                        actual_last_change = Math.max(db_update_seq, last_change_seq);
                        if (last_change_seq != db_update_seq)  {
                            console.log("last change.seq previously received: " + last_change_seq + 
                                        ", differs from current info.update_seq: " + db_update_seq);
                            if (last_change_seq > db_update_seq)  { console.log("switching to using last change.seq for 'since' arg"); }
                        }
                    }
                    else { actual_last_change = db_update_seq; }
                    console.log("actual_last_change: " + actual_last_change);

//                    actual_last_change = db_update_seq;

                    track.getLocalFeatures();  
                    // really want to make changeMonitor run _after_ getLocalFeatures initial run -- 
                    //     make it callback for getLocalFeatures()?
                    track.changeMonitor = pouchdb.changes({
                        include_docs: true, 
                        since: actual_last_change, 
                        continuous: true,
                        onChange: function(change){
                            console.log("POUCHDB changed:");
                            console.log(change);
                            if (window.localStorage)  { window.localStorage.last_change_seq = change.seq; }
                            track.getLocalFeatures();
                        }
                    } );
                    // continuous replication from local pouchDB to remote couchDB
                    if (track.syncToCouchDB)  {
                        console.log("setting up replication");
                        track.toCouchReplicator = 
                            Pouch.replicate(pouchDbName, couchDbUrl, {continuous: true}, 
                                            function(err, result) {
                                                console.log(err); 
                                                console.log(result);
                                                console.log("SUCCESS: set up PouchDB=>CouchDB");
                                            } );
// equivalent to above:
//                         pouchdb.replicate.to(couchDbUrl, {continuous: true},  
//                            function(err, result) {
//                                console.log(err); console.log(result); console.log("set up PouchDB=>CouchDB"); } );


                        // continuous replication from remote couchDB to local pouchDB
                        // changeMonitor set up above should catch any changes to pouchDB that 
                        //      replication from couchDB triggers
                        //      though may want to try replacing changeMonitor with 
                        track.fromCouchReplicator = 
                            Pouch.replicate(couchDbUrl, pouchDbName, {continuous: true
                                                                     //, heartbeat: 10000
                                                                     }, 
                                            function(err, result) {
                                                console.log(err); 
                                                console.log(result);
                                                console.log("SUCCESS: set up CouchdB=>PouchDB");
                                            } );
// equivalent to above
//                         pouchdb.replicate.from(couchDbUrl, {continuous: true},  
//                            function(err, result) {
//                                console.log(err); console.log(result); console.log("set up PouchDB=>CouchDB"); } );
                        
                    }   
                });
            }
        });

    }, 

    getLocalFeatures: function(success_callback, error_callback) {
        var track = this;
        this.success_callback = success_callback;
        track.store.clear();
//        track.changed();

        console.log("called LocalAnnotTrack.getLocalFeatures()"); 
        track.localdb.allDocs({include_docs: true}, 
            function(err, result){
                if (err) {
                    console.log("ERROR in LocalAnnotTrack.getLocalFeatures():");
                    console.log(err);
                }
                else  {
                    var out= "";
                    console.log("   feature count: " + result.rows.length);
                    console.log(result);
                    for (var i=0; i<result.rows.length; i++) {
                        var entry = result.rows[i];
                        var afeat = entry.doc;
                        // console.log(afeat);
                        var jfeat = JSONUtils.createJBrowseFeature( afeat );
                        
                        track.store.insert(jfeat);
                        // console.log(jfeat);
                    }
                    track.changed();
                    // track.createAnnotationChangeListener();
                    if (success_callback) { success_callback(); }
                }
            });
    }, 
    
    /* only to be used with JSON data structure annotation feature */
    createUniqueIds: function(afeature) {
        var track = this;
         if (! afeature.uniquename)  {
             afeature.uniquename = Math.uuid();
             afeature._id = afeature.uniquename;
         }
        if (afeature.children) {
            for (var i=0; i<afeature.children.length; i++){
                var child = afeature.children[i];
                track.createUniqueIds(child);
            }

        }
    }, 

    /**
     *  overriding renderFeature to add event handling right-click context menu
     */
    renderFeature:  function( feature, uniqueId, block, scale, labelScale, descriptionScale, 
                              containerStart, containerEnd ) {
        //  if (uniqueId.length > 20)  {
        //    feature.short_id = uniqueId;
        //  }
        // console.log("LocalAnnotTrack.renderFeature() called on: ");
        // console.log(feature);
        // console.log(featDiv);
        var track = this;
        var featDiv = this.inherited( arguments );

        if (featDiv && featDiv != null)  {
            track.annot_context_menu.bindDomNode(featDiv);
            $(featDiv).droppable(  {
                accept: ".selected-feature",   // only accept draggables that are selected feature divs
                tolerance: "pointer",
                hoverClass: "annot-drop-hover",
                over: function(event, ui)  {
                    track.annot_under_mouse = event.target;
                },
                out: function(event, ui)  {
                    track.annot_under_mouse = null;
                },
                drop: function(event, ui)  {
                    // ideally in the drop() on annot div is where would handle adding feature(s) to annot,
                    //   but JQueryUI droppable doesn't actually call drop unless draggable helper div is actually
                    //   over the droppable -- even if tolerance is set to pointer
                    //      tolerance=pointer will trigger hover styling when over droppable,
                    //           as well as call to over method (and out when leave droppable)
                    //      BUT location of pointer still does not influence actual dropping and drop() call
                    // therefore getting around this by handling hover styling here based on pointer over annot,
                    //      but drop-to-add part is handled by whole-track droppable, and uses annot_under_mouse
                    //      tracking variable to determine if drop was actually on top of an annot instead of
                    //      track whitespace
                    if (track.verbose_drop)  {
                        console.log("dropped feature on annot:");
                        console.log(featDiv);
                    }
                }
            } );
        }
        return featDiv;
    },

    renderSubfeature: function( feature, featDiv, subfeature,
                                displayStart, displayEnd, block) {
        var subdiv = this.inherited( arguments );

        /**
         *  setting up annotation resizing via pulling of left/right edges
         *      but if subfeature is not selectable, do not bind mouse down
         */
        if (subdiv && subdiv != null && (! this.selectionManager.unselectableTypes[subfeature.get('type')]) )  {
            $(subdiv).bind("mousedown", this.annotMouseDown);
        }
        return subdiv;
    },

    /**
     *  get the GenomeView's sequence track -- maybe move this to GenomeView?
     *  WebApollo assumes there is only one SequenceTrack
     *     if there are multiple SequenceTracks, getSequenceTrack returns first one found
     *         iterating through tracks list
     */
    getSequenceTrack: function()  {
        if (this.seqTrack)  {
             return this.seqTrack;
        }
        else  {
            var tracks = this.gview.tracks;
            for (var i = 0; i < tracks.length; i++)  {
//                if (tracks[i] instanceof SequenceTrack)  {
//		if (tracks[i].config.type ==  "WebApollo/View/Track/AnnotSequenceTrack")  {
                if (tracks[i].isWebApolloSequenceTrack)  {
                    this.seqTrack = tracks[i];
		    console.log("found WebApollo sequence track: ", this.seqTrack);
                   // tracks[i].setAnnotTrack(this);
                    break;
                }
            }
        }
        return this.seqTrack;
    }, 

    onFeatureMouseDown: function(event) {
        // _not_ calling DraggableFeatureTrack.prototyp.onFeatureMouseDown --
        //     don't want to allow dragging (at least not yet)
        // event.stopPropagation();
        this.last_mousedown_event = event;
        var ftrack = this;
        if (ftrack.verbose_selection || ftrack.verbose_drag)  {
            console.log("LocalAnnotTrack.onFeatureMouseDown called, genome coord: " + this.getGenomeCoord(event));
        }
        this.handleFeatureSelection(event);
    },

    /**
     *   handles mouse down on an annotation subfeature
     *   to make the annotation resizable by pulling the left/right edges
     */
    onAnnotMouseDown: function(event)  {
        var track = this;
    //    track.last_mousedown_event = event;
        var verbose_resize = track.verbose_resize;
        if (verbose_resize || track.verbose_mousedown)  { console.log("LocalAnnotTrack.onAnnotMouseDown called"); }
        event = event || window.event;
        var elem = (event.currentTarget || event.srcElement);
        // need to redo getLowestFeatureDiv
	// var featdiv = DraggableFeatureTrack.prototype.getLowestFeatureDiv(elem);
	var featdiv = track.getLowestFeatureDiv(elem);

        if (featdiv && (featdiv != null))  {
            if (dojo.hasClass(featdiv, "ui-resizable"))  {
                if (verbose_resize)  {
                    console.log("already resizable");
                    console.log(featdiv);
                }
            }
            else {
                if (verbose_resize)  {
                    console.log("making annotation resizable");
                    console.log(featdiv);
                }
                var scale = track.gview.bpToPx(1);

                // if zoomed int to showing sequence residues, then make edge-dragging snap to interbase pixels
		var gridvals;
                var charSize = track.gview.getSequenceCharacterSize();
                if (scale === charSize.width) { gridvals = [track.gview.charWidth, 1]; }
                else  { gridvals = false; }

                $(featdiv).resizable( {
                    handles: "e, w",
                    helper: "ui-resizable-helper",
                    autohide: false,
                    grid: gridvals,

                    stop: function(event, ui)  {
                        if( verbose_resize ) {
                            console.log("resizable.stop() called, event:");
                            console.dir(event);
                            console.log("ui:");
                            console.dir(ui);
                        }
                        var gview = track.gview;
                        var oldPos = ui.originalPosition;
                        var newPos = ui.position;
                        var oldSize = ui.originalSize;
                        var newSize = ui.size;
                        var leftDeltaPixels = newPos.left - oldPos.left;
                        var leftDeltaBases = Math.round(gview.pxToBp(leftDeltaPixels));
                        var oldRightEdge = oldPos.left + oldSize.width;
                        var newRightEdge = newPos.left + newSize.width;
                        var rightDeltaPixels = newRightEdge - oldRightEdge;
                        var rightDeltaBases = Math.round(gview.pxToBp(rightDeltaPixels));
                        if (verbose_resize)  {
                            console.log("left edge delta pixels: " + leftDeltaPixels);
                            console.log("left edge delta bases: " + leftDeltaBases);
                            console.log("right edge delta pixels: " + rightDeltaPixels);
                            console.log("right edge delta bases: " + rightDeltaBases);
                        }
                        var subfeat = ui.originalElement[0].subfeature;
                        console.log(subfeat);

                        var fmin = subfeat.get('start') + leftDeltaBases;
                        var fmax = subfeat.get('end') + rightDeltaBases;

                        console.log("edge drag editing not yet enabled");
                        /*  do actual edit here */
                        
                        // track.hideAll();   shouldn't need to call hideAll() before changed() anymore
                        track.changed();
                    }
                } );
            }
        }
        event.stopPropagation();
    },

    /**
     *  feature click no-op (to override FeatureTrack.onFeatureClick, which conflicts with mouse-down selection
     */
    onFeatureClick: function(event) {

        if (this.verbose_click)  { console.log("in LocalAnnotTrack.onFeatureClick"); }
        event = event || window.event;
        var elem = (event.currentTarget || event.srcElement);
        var featdiv = this.getLowestFeatureDiv( elem );
        if (featdiv && (featdiv != null))  {
            if (this.verbose_click)  { console.log(featdiv); }
        }
        // do nothing
        //   event.stopPropagation();
    },

    /* feature_records ==> { feature: the_feature, track: track_feature_is_from } */
    addToAnnotation: function(annot, feature_records)  {
        var target_track = this;

                var subfeats = [];
                var allSameStrand = 1;
                for (var i = 0; i < feature_records.length; ++i)  { 
                    var feature_record = feature_records[i];
		    var original_feat = feature_record.feature;
		    var feat = JSONUtils.makeSimpleFeature( original_feat );
                        var isSubfeature = !! feat.parent();  // !! is shorthand for returning true if value is defined and non-null
                        var annotStrand = annot.get('strand');
                        if (isSubfeature)  {
                                var featStrand = feat.get('strand');
                                var featToAdd = feat;
                                if (featStrand != annotStrand) {
                                        allSameStrand = 0;
                                        featToAdd.set('strand', annotStrand);
                                }
                                subfeats.push(featToAdd);
                        }
                        else  {  // top-level feature
                            var source_track = feature_record.track;
                            var subs = feat.get('subfeatures');
                            if ( subs && subs.length > 0 ) {  // top-level feature with subfeatures
                                    for (var i = 0; i < subs.length; ++i) {
                                        var subfeat = subs[i];
                                        var featStrand = subfeat.get('strand');
                                        var featToAdd = subfeat;
                                        if (featStrand != annotStrand) {
                                            allSameStrand = 0;
                                            featToAdd.set('strand', annotStrand);
                                        }
                                        subfeats.push(featToAdd);
                                    }
				    // $.merge(subfeats, subs);
                            }
                            else  {  // top-level feature without subfeatures
                                // make exon feature
                                var featStrand = feat.get('strand');
                                var featToAdd = feat;
                                if (featStrand != annotStrand) {
                                        allSameStrand = 0;
                                        featToAdd.set('strand', annotStrand);
                                }
                                featToAdd.set('type', 'exon');
                                subfeats.push(featToAdd);
                            }
                        }
                }

                if (!allSameStrand && !confirm("Adding features of opposite strand.  Continue?")) {
                        return;
                }

                var featuresString = "";
                for (var i = 0; i < subfeats.length; ++i) {
                        var subfeat = subfeats[i];
                        // if (subfeat[target_track.subFields["type"]] != "wholeCDS") {
                        var source_track = subfeat.track;
                        if ( subfeat.get('type') != "wholeCDS") {
                                var jsonFeature = JSONUtils.createApolloFeature( subfeats[i], "exon");
                                featuresString += ", " + JSON.stringify( jsonFeature );
                        }
                }
//              var parent = JSONUtils.createApolloFeature(annot, target_track.fields, target_track.subfields);
//              parent.uniquename = annot[target_track.fields["name"]];
//                var postData = '{ "track": "' + target_track.getUniqueTrackName() + '", "features": [ {"uniquename": "' + annot.id() + '"}' + featuresString + '], "operation": "add_exon" }';
//                target_track.executeUpdateOperation(postData);
        
        console.log("addToAnnotation not yet implemented in LocalAnnotTrack");
        console.log(featureString);
    },

    makeTrackDroppable: function() {
        var target_track = this;
        var target_trackdiv = target_track.div;
        if (target_track.verbose_drop)  {
            console.log("making track a droppable target: ");
            console.log(this);
            console.log(target_trackdiv);
        }
        $(target_trackdiv).droppable(  {
            // only accept draggables that are selected feature divs
	accept: ".selected-feature",   
            // switched to using deactivate() rather than drop() for drop handling
            // this fixes bug where drop targets within track (feature divs) were lighting up as drop target,
            //    but dropping didn't actually call track.droppable.drop()
            //    (see explanation in feature droppable for why we catch drop at track div rather than feature div child)
            //    cause is possible bug in JQuery droppable where droppable over(), drop() and hoverclass
            //       collision calcs may be off (at least when tolerance=pointer)?
            //
            // Update 3/2012
            // deactivate behavior changed?  Now getting called every time dragged features are release,
            //     regardless of whether they are over this track or not
            // so added another hack to get around drop problem
            // combination of deactivate and keeping track via over()/out() of whether drag is above this track when released
            // really need to look into actual drop calc fix -- maybe fixed in new JQuery releases?
            //
            // drop: function(event, ui)  {
            over: function(event, ui) {
                target_track.track_under_mouse_drag = true;
		if (target_track.verbose_drop) { console.log("droppable entered LocalAnnotTrack") };
            },
            out: function(event, ui) {
                target_track.track_under_mouse_drag = false;
		if (target_track.verbose_drop) { console.log("droppable exited LocalAnnotTrack") };

            },
            deactivate: function(event, ui)  {
                // console.log("trackdiv droppable detected: draggable deactivated");
                // "this" is the div being dropped on, so same as target_trackdiv
                if (target_track.verbose_drop)  { console.log("draggable deactivated"); }

		var dropped_feats = target_track.webapollo.featSelectionManager.getSelection();
                // problem with making individual annotations droppable, so checking for "drop" on annotation here,
                //    and if so re-routing to add to existing annotation
                if (target_track.annot_under_mouse != null)  {
                    if (target_track.verbose_drop)  {
                        console.log("draggable dropped onto annot: ");
                        console.log(target_track.annot_under_mouse.feature);
                    }
                    target_track.addToAnnotation(target_track.annot_under_mouse.feature, dropped_feats);
                }
                else if (target_track.track_under_mouse_drag) {
                    if (target_track.verbose_drop)  { console.log("draggable dropped on LocalAnnotTrack"); }
                    target_track.createAnnotations(dropped_feats);
                }
                // making sure annot_under_mouse is cleared
                //   (should do this in the drop?  but need to make sure _not_ null when
                target_track.annot_under_mouse = null;
                target_track.track_under_mouse_drag = false;
            }
        } );
        if( target_track.verbose_drop) { console.log("finished making droppable target"); }
    },

    createAnnotations: function(selection_records)  {
            var target_track = this;
            var featuresToAdd = new Array();
            var parentFeatures = new Object();
            for (var i in selection_records)  {
                    var dragfeat = selection_records[i].feature;

                    var is_subfeature = !! dragfeat.parent();  // !! is shorthand for returning true if value is defined and non-null
                    var parentId = is_subfeature ? dragfeat.parent().id() : dragfeat.id();

                    if (parentFeatures[parentId] === undefined) {
                            parentFeatures[parentId] = new Array();
                            parentFeatures[parentId].isSubfeature = is_subfeature;
                    }
                    parentFeatures[parentId].push(dragfeat);
            }

            for (var i in parentFeatures) {
                    var featArray = parentFeatures[i];
                    if (featArray.isSubfeature) {
                    	var parentFeature = featArray[0].parent();
                    	// var fmin = undefined;
                    	// var fmax = undefined;
                    	var featureToAdd = JSONUtils.makeSimpleFeature(parentFeature);
                    	featureToAdd.set('subfeatures', new Array());
                   	for (var k = 0; k < featArray.length; ++k) {
                    	    var dragfeat = JSONUtils.makeSimpleFeature(featArray[k]);
                    	    featureToAdd.get("subfeatures").push( dragfeat );
                        }
                   /*	
                       for (var k = 0; k < featArray.length; ++k) {
                    		// var dragfeat = featArray[k];
                    		var dragfeat = JSONUtils.makeSimpleFeature(featArray[k]);
                    		var childFmin = dragfeat.get('start');
                    		var childFmax = dragfeat.get('end');
                    		if (fmin === undefined || childFmin < fmin) {
                    			fmin = childFmin;
                    		}
                    		if (fmax === undefined || childFmax > fmax) {
                    			fmax = childFmax;
                    		}
                    		featureToAdd.get("subfeatures").push( dragfeat );
                    	}
                    	featureToAdd.set( "start", fmin );
                    	featureToAdd.set( "end",   fmax );
                    */
                        target_track.resizeFeatureParent(featureToAdd);  // set parent start/end to union of child starts/ends 
                    	var afeat = JSONUtils.createApolloFeature( featureToAdd, "transcript" );
                    	featuresToAdd.push(afeat);
                    }
                    else {
                            for (var k = 0; k < featArray.length; ++k) {
                                    var dragfeat = featArray[k];
                                    var afeat = JSONUtils.createApolloFeature( dragfeat, "transcript");
                                    featuresToAdd.push(afeat);
                            }
                    }
            }

        
            // var postData = '{ "track": "' + target_track.getUniqueTrackName() + '", "features": ' + JSON.stringify(featuresToAdd) + ', "operation": "add_transcript" }';
            // target_track.executeUpdateOperation(postData);
       //  console.log("attempting to create annotation in LocalAnnotTrack");
        console.log(featuresToAdd);

        for (i = 0; i<featuresToAdd.length; i++)  {
            /* do the creation! */
            var afeat = featuresToAdd[i];
            target_track.createUniqueIds(afeat);  // need to assign children unique IDs for proper selection, edge-matching, etc.
            console.log("createAnnotation() called");
            // console.log(afeat);
            // target_track.localdb.post(afeat);
            // already assigned IDs (used Pouch.uuid() for both parent and child IDs) so using put() instead of post()
            target_track.localdb.put(afeat, function(error, response) {
                                         console.log("localdb.put() returned");
                                         console.log(response);
                                         target_track.localdb.info( function(e,r)  {
                                               console.log("localdb.info() after put(): ");
                                               console.log(r);
                                         } );

                                         } );
        }
    }, 

 
    /**
     *  If there are multiple LocalAnnotTracks, each has a separate FeatureSelectionManager
     *    (contrasted with DraggableFeatureTracks, which all share the same selection and selection manager
     */
    deleteSelectedFeatures: function()  {
        var selected = this.selectionManager.getSelection();
        this.selectionManager.clearSelection();
        this.deleteAnnotations(selected);
    },

    deleteAnnotations: function(records) {
        var track = this;
        var features = '"features": [';
        var uniqueNames = [];
        var afeats = [];
        for (var i in records)  {
	    var record = records[i];
	    var selfeat = record.feature;
	    var seltrack = record.track;
            var afeat = selfeat.afeature;
            var uniqueName = selfeat.id();
            // just checking to ensure that all features in selection are from this track --
            //   if not, then don't try and delete them
            if (seltrack === track)  {
                var trackdiv = track.div;
                var trackName = track.getUniqueTrackName();
                
                var ancestor = selfeat;
                while (ancestor.parent()) { ancestor = ancestor.parent(); }

                /* do the deletion! */                
                if (ancestor == selfeat) {  // deleting a feature
                    console.log("deleting top-level feature");
                    console.log(afeat);
                    track.localdb.remove(afeat, function(e,r) { console.log(e); console.log(r); });
                }
                else  { // deleting a subfeature
                    console.log("deleting child feature");
                    var parent = selfeat.parent();
                    // var pannot = parent.afeature;
//                    var pannot = $(parent.afeature).clone();
                    var pannot = dojo.clone(parent.afeature);  // dojo is in global namespace?
                    var old_subannots = pannot.children;
                    var new_subannots = [];
                    for (var k=0; k<old_subannots.length; k++) {
                        var subannot = old_subannots[k];
                        if (afeat._id === subannot._id)  {  // check by id, since afeat is from feature and subannot is from feature copy
                            console.log("found afeat");
                        }
                        else  {
                            new_subannots.push(subannot);
                        }
                    }
                    pannot.children = new_subannots;
                    if (pannot.children.length == 0)  {
                        console.log("no children left, deleting parent");
                        // if no children left then delete parent
                        track.localdb.remove(pannot, function(e,r) { console.log(e); console.log(r); });
                    }
                    else {
                        var bounds_changed = track.resizeAnnotParent(pannot); // returns true if parent bounds changed by resizeParent
                        if (track.delayAnnot) {
                            console.log("Delaying annot");
                            setTimeout( function() { 
                                            console.log("DELAYED ANNOT");
                                            track.localdb.put(pannot, function(e,r) { console.log(e); console.log(r); });
                                            }, 30000 );
                        }
                        else {
                            track.localdb.put(pannot, function(e,r) { console.log(e); console.log(r); });
                        }
                    }
                }
            }
        }
        // var postData = '{ "track": "' + trackName + '", ' + features + ', "operation": "delete_feature" }';
        // track.executeUpdateOperation(postData);
    }, 

    /*  feature is methodized JBrowse feature
     *     (which basically means has set, get, children, parent methods)
     *  sets feature start and end to exactly encompass all children
     *  if no children, feature start and end are unchanged
     *  returns true if feature bounds changed, false if bounds were unchanged
     */
    resizeFeatureParent: function(feature) {
        // resize parent to children in case edge child was deleted
        var min = Number.MAX_VALUE;
        var max = Number.MIN_VALUE;
        var subfeats = feature.children();
        if (subfeats && (subfeats.length > 0))  {
            for (var k=0; k<subfeats.length; k++) {
                min = Math.min(min, subfeats[k].get('start'));
                max = Math.max(max, subfeats[k].get('end'));
            }
            if ( min != feature.get('start') || max != feature.get('end') ) {
                feature.set('start', min);
                feature.set('end', max);
                return true;  // children, and feature bounds changed
            }
            else return false;  // children, but feature bounds remains same
        }
        else  {
            return false;  // no children, feature bounds remains same
        }
    }, 

    /*  afeature is in format returned by AnnotationEditorService
     *   (JAFeature.afeature for JAFeatures)
     *  sets afeature fmin and fmax to exactly encompass all children
     *  if no children, afeature fmin and fmax are unchanged
     *  returns true if parent bounds changed, false if they were unchanged
     */
    resizeAnnotParent: function(afeature)  {
        // resize parent to children in case edge child was deleted
        var min = Number.MAX_VALUE;
        var max = Number.MIN_VALUE;
        var subfeats = afeature.children;
        if (subfeats && (subfeats.length > 0))  {
            for (var k=0; k<subfeats.length; k++) {
                min = Math.min(min, subfeats[k].location.fmin);
                max = Math.max(max, subfeats[k].location.fmax);
            }
            if ( min != afeature.location.fmin || max != afeature.location.fmax ) {
                afeature.location.fmin = min;
                afeature.location.fmax = max;
                return true;  // children, and afeature bounds changed
            }
            else return false;  // children, but afeature bounds remains same
        }
        else  {
            return false;  // no children, afeature bounds remains same
        }
    }, 

  
    zoomToBaseLevel: function(event) {
        var coordinate = this.getGenomeCoord(event);
        this.gview.zoomToBaseLevel(event, coordinate);
    },

 
    scrollToNextEdge: function(event)  {
        //         var coordinate = this.getGenomeCoord(event);
        var vregion = this.gview.bvisibleRegion();
        var coordinate = (vregion.start + vregion.end)/2;
        var selected = this.selectionManager.getSelection();
        if (selected && (selected.length > 0)) {
            var selfeat = selected[0].feature;
            // find current center genome coord, compare to subfeatures, 
            //   figure out nearest subfeature right of center of view 
            //   if subfeature overlaps, go to right edge
            //   else go to left edge 
            //   if to left, move to left edge
            //   if to right, 
            while (selfeat.parent()) {
                selfeat = selfeat.parent();
            }
            var coordDelta = Number.MAX_VALUE;
            var pmin = selfeat.get('start');
            var pmax = selfeat.get('end');
            if ((coordinate - pmax) > 10) {
                this.gview.centerAtBase(pmin, false);
            }
            else  {
                var childfeats = selfeat.children();                
                for (var i=0; i<childfeats.length; i++)  {
                    var cfeat = childfeats[i];
                    var cmin = cfeat.get('start');
                    var cmax = cfeat.get('end');
                    //            if (cmin > coordinate)  {
                    if ((cmin - coordinate) > 10) { // fuzz factor of 10 bases
                        coordDelta = Math.min(coordDelta, cmin-coordinate);
                    }
                    //            if (cmax > coordinate)  {
                    if ((cmax - coordinate) > 10) { // fuzz factor of 10 bases
                        coordDelta = Math.min(coordDelta, cmax-coordinate);
                    }
                }
                // find closest edge right of current coord
                if (coordDelta != Number.MAX_VALUE)  {
                    var newCenter = coordinate + coordDelta;
                    this.gview.centerAtBase(newCenter, false);
                }
            }
        }
    }, 

   scrollToPreviousEdge: function(event) {
        //         var coordinate = this.getGenomeCoord(event);
        var vregion = this.gview.visibleRegion();
        var coordinate = (vregion.start + vregion.end)/2;
        var selected = this.selectionManager.getSelection();
        if (selected && (selected.length > 0)) {
            
            var selfeat = selected[0].feature;
            // find current center genome coord, compare to subfeatures, 
            //   figure out nearest subfeature right of center of view 
            //   if subfeature overlaps, go to right edge
            //   else go to left edge 
            //   if to left, move to left edge
            //   if to right, 
            while (selfeat.parent()) {
                selfeat = selfeat.parent();
            }
            var coordDelta = Number.MAX_VALUE;
            var pmin = selfeat.get('start');
            var pmax = selfeat.get('end');
            if ((pmin - coordinate) > 10) {
                this.gview.centerAtBase(pmax, false);
            }
            else  {
                var childfeats = selfeat.children();                
                for (var i=0; i<childfeats.length; i++)  {
                    var cfeat = childfeats[i];
                    var cmin = cfeat.get('start');
                    var cmax = cfeat.get('end');
                    //            if (cmin > coordinate)  {
                    if ((coordinate - cmin) > 10) { // fuzz factor of 10 bases
                        coordDelta = Math.min(coordDelta, coordinate-cmin);
                    }
                    //            if (cmax > coordinate)  {
                    if ((coordinate - cmax) > 10) { // fuzz factor of 10 bases
                        coordDelta = Math.min(coordDelta, coordinate-cmax);
                    }
                }
                // find closest edge right of current coord
                if (coordDelta != Number.MAX_VALUE)  {
                    var newCenter = coordinate - coordDelta;
                    this.gview.centerAtBase(newCenter, false);
                }
            }
        }
    }, 

    zoomBackOut: function(event) {
        this.gview.zoomBackOut(event);
    },

    handleError: function(response) {
        console.log("ERROR: ");
        console.log(response);  // in Firebug, allows retrieval of stack trace, jump to code, etc.
	console.log(response.stack);
        var error = eval('(' + response.responseText + ')');
        //      var error = response.error ? response : eval('(' + response.responseText + ')');
        if (error && error.error) {
            alert(error.error);
		return false;
        }
    },

    handleConfirm: function(response) {
            return confirm(response); 
    },
    

    
  initAnnotContextMenu: function() {
    var thisObj = this;
    thisObj.contextMenuItems = new Array();
    thisObj.annot_context_menu = new dijit.Menu({});           
    var contextMenuItems = thisObj.contextMenuItems;
    var annot_context_menu = thisObj.annot_context_menu;
      
    var permission = thisObj.permission;
    var index = 0;
    annot_context_menu.addChild(new dijit.MenuItem( {
    	label: "Information",
    	onClick: function(event) {
    		thisObj.getAnnotationInformation();
    	}
    } ));
    contextMenuItems["information"] = index++;
    annot_context_menu.addChild(new dijit.MenuItem( {
    	label: "Get sequence",
    	onClick: function(event) {
    		thisObj.getSequence();
    	}
    } ));
    contextMenuItems["get_sequence"] = index++;

    annot_context_menu.addChild(new dijit.MenuItem( {
    	label: "Zoom to base level",
    	onClick: function(event) {
    		if (thisObj.getMenuItem("zoom_to_base_level").get("label") == "Zoom to base level") {
    			thisObj.zoomToBaseLevel(thisObj.annot_context_mousedown);
    		}
    		else {
    			thisObj.zoomBackOut(thisObj.annot_context_mousedown);
    		}
    	}
    } ));
    contextMenuItems["zoom_to_base_level"] = index++;

    if (permission & Permission.WRITE) {
    	annot_context_menu.addChild(new dijit.MenuSeparator());
    	index++;
    	annot_context_menu.addChild(new dijit.MenuItem( {
    		label: "Delete",
    		onClick: function() {
    			thisObj.deleteSelectedFeatures();
    		}
    	} ));
    	contextMenuItems["delete"] = index++;
    }

	annot_context_menu.onOpen = function(event) {
		// keeping track of mousedown event that triggered annot_context_menu popup, 
		//   because need mouse position of that event for some actions
		thisObj.annot_context_mousedown = thisObj.last_mousedown_event;
		if (thisObj.permission & Permission.WRITE) {
			thisObj.updateMenu();
		}
		dojo.forEach(this.getChildren(), function(item, idx, arr) {
			if (item instanceof dijit.MenuItem) {
				item._setSelected(false);
				item._onUnhover();
			}
		});
	};
	
    annot_context_menu.startup();
}, 



makeTrackMenu: function()  {
    this.inherited( arguments );
    var track = this;
    var options = this._trackMenuOptions();
    if( options && options.length && this.label && this.labelMenuButton && this.exportAdapters.length > 0) {
        var dataAdaptersMenu = new dijit.Menu();
        for (var i=0; i<this.exportAdapters.length; i++) {
            var dataAdapter = this.exportAdapters[i];
            dataAdaptersMenu.addChild(new dijit.MenuItem( {
                label: dataAdapter.key,
                onClick: function(key, options) {
			   return function() {
			       track.exportData(key, options);
	                   };
		        }(dataAdapter.key, dataAdapter.options)
                } ) );
        }
        // if there's a menu separator, add right before first seperator (which is where default save is added), 
        //     otherwise add at end
        var mitems = this.trackMenu.getChildren();
        for (var mindex=0; mindex < mitems.length; mindex++) {
            if (mitems[mindex].type == "dijit/MenuSeparator")  { break; }
        }
         
        var savePopup = new dijit.PopupMenuItem({
                label: "Save track data",
                iconClass: 'dijitIconSave',
                popup: dataAdaptersMenu });
        this.trackMenu.addChild(savePopup, mindex);
    }
}, 



    initPopupDialog: function() {
    	var track = this;
    	var id = "LocalAnnotTrack_popup_dialog";

    	// deregister widget (needed if changing refseq without reloading page)
    	var widget = dijit.registry.byId(id);
    	if (widget) {
    		widget.destroy();
    	}
    	track.popupDialog = new dijitDialog({
    		preventCache: true,
    		id: id
    	});
    	dojo.connect(track.popupDialog, "onHide", null, function() {
    		document.activeElement.blur();
    		track.selectionManager.clearSelection();
    		if (track.getSequenceTrack())  {
    			track.getSequenceTrack().clearHighlightedBases();
    		}
    	});
    	track.popupDialog.startup();

    },

    getUniqueTrackName: function() {
        return this.name + "-" + this.refSeq.name;
    },

    openDialog: function(title, data) {
        this.popupDialog.set("title", title);
        this.popupDialog.set("content", data);
        this.popupDialog.show();
        this.popupDialog.placeAt("GenomeBrowser", "first");
    },

    updateMenu: function() {
        // this.updateSetTranslationStartMenuItem();
        // this.updateMergeMenuItem();
        // this.updateSplitMenuItem();
        // this.updateMakeIntronMenuItem();
        // this.updateFlipStrandMenuItem();
        // this.updateEditCommentsMenuItem();
        // this.updateEditDbxrefsMenuItem();
        // this.updateUndoMenuItem();
        // this.updateRedoMenuItem();
        this.updateZoomToBaseLevelMenuItem();
        // this.updateDuplicateMenuItem();
    },

 
    updateZoomToBaseLevelMenuItem: function() {
        var menuItem = this.getMenuItem("zoom_to_base_level");
        if( !this.gview.isZoomedToBase() ) {
            menuItem.set("label", "Zoom to base level");
        }
        else {
            menuItem.set("label", "Zoom back out");
        }
    },

    getMenuItem: function(operation) {
        return this.annot_context_menu.getChildren()[this.contextMenuItems[operation]];
    },

    sortAnnotationsByLocation: function(annots) {
        var track = this;
        return annots.sort(function(annot1, annot2) {
                               var start1 = annot1.get("start");
                               var end1 = annot1.get("end");
                               var start2 = annot2.get("start");
                               var end2 = annot2.get('end');

                               if (start1 != start2)  { return start1 - start2; }
                               else if (end1 != end2) { return end1 - end2; }
                               else                   { return 0; }
                               /*
                                if (annot1[track.fields["start"]] != annot2[track.fields["start"]]) {
                                return annot1[track.fields["start"]] - annot2[track.fields["start"]];
                                }
                                if (annot1[track.fields["end"]] != annot2[track.fields["end"]]) {
                                return annot1[track.fields["end"]] - annot2[track.fields["end"]];
                                }
                                return 0;
                                */
                           });
    },



    /**
     * handles adding overlay of sequence residues to "row" of selected feature
     *   (also handled in similar manner in fillBlock());
     * WARNING:
     *    this _requires_ browser support for pointer-events CSS property,
     *    (currently supported by Firefox 3.6+, Chrome 4.0+, Safari 4.0+)
     *    (Exploring possible workarounds for IE, for example see:
     *        http://www.vinylfox.com/forwarding-mouse-events-through-layers/
     *        http://stackoverflow.com/questions/3680429/click-through-a-div-to-underlying-elements
     *            [ see section on CSS conditional statement workaround for IE ]
     *    )
     *    and must set "pointer-events: none" in CSS rule for div.annot-sequence
     *    otherwise, since sequence overlay is rendered on top of selected features
     *        (and is a sibling of feature divs), events intended for feature divs will
     *        get caught by overlay and not make it to the feature divs
     */
    selectionAdded: function( rec, smanager)  {
        var feat = rec.feature;
        this.inherited( arguments );

        var track = this;

	// switched to only have most recent selected annot have residues overlay if zoomed to base level, 
	//    rather than all selected annots
	// therefore want to revove all prior residues overlay divs
        if (rec.track === track)  {
            // remove sequence text nodes
            $("div.annot-sequence", track.div).remove();
        }

        // want to get child of block, since want position relative to block
        // so get top-level feature div (assumes top level feature is always rendered...)
        var topfeat = LocalAnnotTrack.getTopLevelAnnotation(feat);
        var featdiv = track.getFeatDiv(topfeat);
	if (featdiv)  {
	    var strand = topfeat.get('strand');
            var selectionYPosition = $(featdiv).position().top;
            var scale = track.gview.bpToPx(1);
            var charSize = track.gview.getSequenceCharacterSize();
            if (scale === charSize.width && track.useResiduesOverlay)  {
                var seqTrack = this.getSequenceTrack();
                for (var bindex = this.firstAttached; bindex <= this.lastAttached; bindex++)  {
                    var block = this.blocks[bindex];
		    // seqTrack.getRange(block.startBase, block.endBase,
                    //  seqTrack.sequenceStore.getRange(this.refSeq, block.startBase, block.endBase,
		    seqTrack.sequenceStore.getFeatures({ ref: this.refSeq.name, start: block.startBase, end: block.endBase },
	                    function(feat) {
				var start = feat.get('start');
				var end   = feat.get('end');
				var seq   = feat.get('seq');
			    
                            // var ypos = $(topfeat).position().top;
                            // +2 hardwired adjustment to center (should be calc'd based on feature div dims?
                            var ypos = selectionYPosition + 2;
                            // checking to see if residues for this "row" of the block are already present
                            //    ( either from another selection in same row, or previous rendering
                            //        of same selection [which often happens when scrolling] )
                            // trying to avoid duplication both for efficiency and because re-rendering of text can
                            //    be slighly off from previous rendering, leading to bold / blurry text when overlaid

                            var $seqdivs = $("div.annot-sequence", block);
                            var sindex = $seqdivs.length;
                            var add_residues = true;
                            if ($seqdivs && sindex > 0)  {
                                for (var i=0; i<sindex; i++) {
                                    var sdiv = $seqdivs[i];
                                    if ($(sdiv).position().top === ypos)  {
                                        // console.log("residues already present in block: " + bindex);
                                        add_residues = false;
                                    }
                                }
                            }
                            if (add_residues)  {
                                var seqNode = document.createElement("div");
                                seqNode.className = "annot-sequence";
				if (strand == '-' || strand == -1)  {
				    // seq = track.reverseComplement(seq);
				    seq = track.getSequenceTrack().complement(seq);
				}
                                seqNode.appendChild(document.createTextNode(seq));
                                // console.log("ypos: " + ypos);
                                seqNode.style.cssText = "top: " + ypos + "px;";
                                block.appendChild(seqNode);
                                if (track.FADEIN_RESIDUES)  {
                                    $(seqNode).hide();
                                    $(seqNode).fadeIn(1500);
                                }
                            }
                        } );

                }
            }
        }

    },

    selectionRemoved: function(selected_record, smanager)  {
	// console.log("LocalAnnotTrack.selectionRemoved() called");
	this.inherited( arguments );
	var track = this;
	if (selected_record.track === track)  {
	    var feat = selected_record.feature;
	    var featdiv = this.getFeatDiv(feat);
	    // remove sequence text nodes
	    // console.log("removing base residued text from selected annot");
	    $("div.annot-sequence", track.div).remove();
	}
    }, 

    // , 
    // endZoom: function(destScale, destBlockBases) {
    //     DraggableFeatureTrack.prototype.endZoom.call(this, destScale, destBlockBases);
    // };

    startZoom: function(destScale, destStart, destEnd) {
        // would prefer to only try and hide dna residues on zoom if previous scale was at base pair resolution
        //   (otherwise there are no residues to hide), but by time startZoom is called, pxPerBp is already set to destScale,
        //    so would require keeping prevScale var around, or passing in prevScale as additional parameter to startZoom()
        // so for now just always trying to hide residues on a zoom, whether they're present or not

        this.inherited( arguments );

        // console.log("LocalAnnotTrack.startZoom() called");
        var selected = this.selectionManager.getSelection();
        if( selected.length > 0 ) {
            // if selected annotations, then hide residues overlay
            //     (in case zoomed in to base pair resolution and the residues overlay is being displayed)
            $(".annot-sequence", this.div).css('display', 'none');
        }
    }

});

LocalAnnotTrack.getTopLevelAnnotation = function(annotation) {
    while( annotation.parent() ) {
        annotation = annotation.parent();
    }
    return annotation;
};

return LocalAnnotTrack;
});

/*
  Copyright (c) 2010-2013 Berkeley Bioinformatics Open Projects (BBOP)

  This package and its accompanying libraries are free software; you can
  redistribute it and/or modify it under the terms of the LGPL (either
  version 2.1, or at your option, any later version) or the Artistic
  License 2.0.  Refer to LICENSE for the full license text.

*/
