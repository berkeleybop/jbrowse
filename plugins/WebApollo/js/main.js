require({
           packages: [
               { name: 'jqueryui', location: '../plugins/WebApollo/jslib/jqueryui' },
               { name: 'jquery', location: '../plugins/WebApollo/jslib/jquery', main: 'jquery' }
           ]
       },
       [],
       function() {

define.amd.jQuery = true;

define(
       [
           'dojo/_base/declare',
           'dijit/MenuItem', 
           'dijit/CheckedMenuItem',
           'dijit/form/DropDownButton',
           'dijit/DropDownMenu',
           'JBrowse/Plugin',
           './FeatureEdgeMatchManager',
	   './FeatureSelectionManager'
       ],
    function( declare, dijitMenuItem, dijitCheckedMenuItem, dijitDropDownButton, dijitDropDownMenu, JBPlugin, 
              FeatureEdgeMatchManager, FeatureSelectionManager ) {

return declare( JBPlugin,
{
//    colorCdsByFrame: false,
//    searchMenuInitialized: false,

    constructor: function( args ) {
        var webapollo = this;
        this.colorCdsByFrame = false;
        this.searchMenuInitialized = false;
        var browser = this.browser;  // this.browser set in Plugin superclass constructor

        if (! browser.config.helpUrl)  {
	    browser.config.helpUrl = "http://genomearchitect.org/WebApolloHelp";
        }

        // hand the browser object to the feature edge match manager
        FeatureEdgeMatchManager.setBrowser( browser );

	this.featSelectionManager = new FeatureSelectionManager();
	this.annotSelectionManager = new FeatureSelectionManager();

	// setting up selection exclusiveOr --
	//    if selection is made in annot track, any selection in other tracks is deselected, and vice versa,
	//    regardless of multi-select mode etc.
	this.annotSelectionManager.addMutualExclusion(this.featSelectionManager);
	this.featSelectionManager.addMutualExclusion(this.annotSelectionManager);

	FeatureEdgeMatchManager.addSelectionManager(this.featSelectionManager);
	FeatureEdgeMatchManager.addSelectionManager(this.annotSelectionManager);

      // webapollo.initDevTools();

        // add a global menu option for setting CDS color
        var cds_frame_toggle = new dijitCheckedMenuItem(
                {
                    label: "Color by CDS frame",
                    checked: false,
                    onClick: function(event) {
                        webapollo.colorCdsByFrame = cds_frame_toggle.checked;
                        browser.view.redrawTracks();
                    }
                });
        browser.addGlobalMenuItem( 'options', cds_frame_toggle );
        var plus_strand_toggle = new dijitCheckedMenuItem(
                {
                    label: "Show plus strand",
                    checked: true,
                    onClick: function(event) {
                        var plus = plus_strand_toggle.checked;
                        var minus = minus_strand_toggle.checked;
                        console.log("plus: ", plus, " minus: ", minus);
                        if (plus && minus)  {
                            browser.view.featureFilter = browser.view.passAllFilter;
                        }
                        else if (plus)  {
                            browser.view.featureFilter = browser.view.plusStrandFilter;
                        }
                        else if (minus)  {
                            browser.view.featureFilter = browser.view.minusStrandFilter;
                        }
                        else  {
                            browser.view.featureFilter = browser.view.passNoneFilter;
                        }
                        // browser.view.redrawTracks();
                        webapollo.redoLayout();
                    }
                });
        browser.addGlobalMenuItem( 'options', plus_strand_toggle );
        var minus_strand_toggle = new dijitCheckedMenuItem(
                {
                    label: "Show minus strand",
                    checked: true,
                    onClick: function(event) {
                        var plus = plus_strand_toggle.checked;
                        var minus = minus_strand_toggle.checked;
                        console.log("plus: ", plus, " minus: ", minus);
                        if (plus && minus)  {
                            browser.view.featureFilter = browser.view.passAllFilter;
                        }
                        else if (plus)  {
                            browser.view.featureFilter = browser.view.plusStrandFilter;
                        }
                        else if (minus)  {
                            browser.view.featureFilter = browser.view.minusStrandFilter;
                        }
                        else  {
                            browser.view.featureFilter = browser.view.passNoneFilter;
                        }
                        // browser.view.redrawTracks();
                        webapollo.redoLayout();
                    }
                });
        browser.addGlobalMenuItem( 'options', minus_strand_toggle );

        // register the WebApollo track types with the browser, so
        // that the open-file dialog and other things will have them
        // as options
        browser.registerTrackType({
            type:                 'WebApollo/View/Track/DraggableHTMLFeatures',
            defaultForStoreTypes: [ 'JBrowse/Store/SeqFeature/NCList',
                                    'JBrowse/Store/SeqFeature/GFF3'
                                  ],
            label: 'WebApollo Features'
        });
        browser.registerTrackType({
            type:                 'WebApollo/View/Track/DraggableAlignments',
            defaultForStoreTypes: [ 
                                    'JBrowse/Store/SeqFeature/BAM',
                                  ],
            label: 'WebApollo Alignments'
        });
        browser.registerTrackType({
            type:                 'WebApollo/View/Track/SequenceTrack',
            defaultForStoreTypes: [ 'JBrowse/Store/Sequence/StaticChunked' ],
            label: 'WebApollo Sequence'
        });

        // put the WebApollo logo in the powered_by place in the main JBrowse bar
        browser.afterMilestone( 'initView', function() {
            browser.poweredByLink.innerHTML = '<img src=\"plugins/WebApollo/img/ApolloLogo_100x36.png\" height=\"25\" />';
            webapollo.initDevTools();
        });

    },  


    initDevTools: function() {
        var webapollo = this;
        window.latrack = webapollo.getLocalAnnotTrack();
        window.atrack = webapollo.getAnnotTrack();
        window.webapollo = this;  
        window.pcb = function(e,r) { console.log(e); console.log(r); }  // standard logging function for pouchdb callbacks (pcb)

        var browser = webapollo.browser;
        if (! webapollo.devMenuInitialized) { 
            var local_annot_delay = new dijitCheckedMenuItem(
                {
                    label: "Delay Annot 30 seconds", 
                    checked: false,
                    onClick: function(event) {
                        webapollo.getLocalAnnotTrack().delayAnnot = local_annot_delay.checked;
                        browser.view.redrawTracks();
                    }
                });

            browser.addGlobalMenuItem( 'devtools', local_annot_delay);

            var pouch_to_couch = new dijitCheckedMenuItem(
                {
                    label: "local => remote replication", 
                    checked: true,
                    onClick: function(event) {
                        webapollo.getLocalAnnotTrack().delayAnnot = local_annot_delay.checked;
                        browser.view.redrawTracks();
                    }
                });
            browser.addGlobalMenuItem( 'devtools', local_annot_delay);
            

            var delete_pouch_couch = new dijitMenuItem(
                {
		    label: "Delete PouchDB & CouchDB", 
		    onClick: function() {
		        var loctrack = webapollo.getLocalAnnotTrack();
                        // loctrack.changeMonitor.cancel();
                        // loctrack.toCouchReplicator.cancel();
                        // loctrack.fromCouchReplicator.cancel();
                        var remoteCouch = new CouchDB("http://localhost:5984/" + loctrack.pouchDbName);
                        window.couchdb = remoteCouch;
                        var couch_deleted = remoteCouch.deleteDb();
                        console.log("couchdb.deleteDb() result: "); console.log(couch_deleted);
                        var pouch_deleted = 
                             Pouch.destroy(loctrack.pouchDbName, function(err, success)  {
                                          if (err) { console.log("Pouch.destroy() error: "); console.log(err); }
                                          else  { console.log("Pouch.destroy() success: "); 
                                                  console.log(success);
                                                  // loctrack.initializePouch();
                                          }
                             } );
                        
                    }
                }
            );
            browser.addGlobalMenuItem( 'devtools', delete_pouch_couch);


            var flush_pouch_button = new dijitMenuItem(
                {
		    label: "Reset PouchDB", 
		    onClick: function() {
		        var loctrack = webapollo.getLocalAnnotTrack();
                        Pouch.destroy(loctrack.pouchDbName, function(err, success)  {
                            loctrack.initializePouch();
                        } );
                    }
                }
            );
            browser.addGlobalMenuItem( 'devtools', flush_pouch_button);

            // this chunk MUST execute AFTER browser.addGlobalMenuItem() has been called ?!?!
            var devMenu = browser.makeGlobalMenu('devtools');
            if( devMenu ) {
                var devButton = new dijitDropDownButton(
                    { className: 'file',
                      innerHTML: 'DevTools',
                      //title: '',
                      dropDown: devMenu
                    });
                dojo.addClass( devButton.domNode, 'menu' );
                browser.menuBar.appendChild( devButton.domNode );
            }
 
            webapollo.devMenuInitialized = true;
        }
    }, 

    // would rather call view.redrawTracks()
    //
    // BUT, view.redrawTracks currently doesn't force relayout
    //     browser.view.redrawTracks();
    // track.changed() forces relayout (at least for HTMLFeatures)
    //    but also call changeCallBack(), which currently is always view.showVisibleBlocks()
    //    thus will needlessly call view.showVisibleBlocks() repeatedly 
    // so trying for now to be explicit
    redoLayout: function()  {
        this.browser.view.trackIterate( function(t) { 
                                       t.hideAll(); 
                                       if (t._clearLayout)  { 
                                           // console.log("clearing layout for track: " + t.label);
                                           t._clearLayout(); 
                                       } 
                                   } 
                                 );
        this.browser.view.showVisibleBlocks(true);
    }, 

/** 
 * hacking addition of a "tools" menu to standard JBrowse menubar, 
 *    with a "Search Sequence" dropdown
 */
    initSearchMenu: function()  {
        if (! this.searchMenuInitialized) { 
            var webapollo = this;
            this.browser.addGlobalMenuItem( 'tools',
                                            new dijitMenuItem(
                                                {
		                                    label: "Search sequence",
		                                    onClick: function() {
		                                        webapollo.getAnnotTrack().searchSequence();
		                                    }
                                                }) );
            var toolMenu = this.browser.makeGlobalMenu('tools');
            if( toolMenu ) {
                var toolButton = new dijitDropDownButton(
                    { className: 'file',
                      innerHTML: 'Tools',
                      //title: '',
                      dropDown: toolMenu
                    });
                dojo.addClass( toolButton.domNode, 'menu' );
                this.browser.menuBar.appendChild( toolButton.domNode );
            }
        }
        this.searchMenuInitialized = true;
    }, 

    getAnnotTrack: function()  {
        if (this.browser && this.browser.view && this.browser.view.tracks)  {
            var tracks = this.browser.view.tracks;
            for (var i = 0; i < tracks.length; i++)  {
	        // should be doing instanceof here, but class setup is not being cooperative
                if (tracks[i].isWebApolloAnnotTrack)  {
                    console.log("annot track refseq: " + tracks[i].refSeq.name);
                    window.atrack = tracks[i];  // exporting for easy debugging access
                    return tracks[i];
                }
            }
        }
        return null;
    },

    getLocalAnnotTrack: function()  {
        if (this.browser && this.browser.view && this.browser.view.tracks)  {
            var tracks = this.browser.view.tracks;
            for (var i = 0; i < tracks.length; i++)  {
	        // should be doing instanceof here, but class setup is not being cooperative
                if (tracks[i].isWebApolloLocalAnnotTrack)  {
                    console.log("local annot track refseq: " + tracks[i].refSeq.name);
                    window.latrack = tracks[i];  // exporting for easy debuggins access
                    return tracks[i];
                }
            }
        }
        return null;
    }

});

});

});