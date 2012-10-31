describe("GFF3toJbrowseJson", function() { 
	// GFF3toNclist takes a data structure such as that returned by GFF3toJson.js 
	// and makes it into an nested containment list suitable for use in 
	// WebApollo and possibly Jbrowse. 

	var nclistGen;
	var parsedGFF3toJbrowseJsonInput, expectedJbrowseJsonOutput, actualJbrowseJsonOutput;
	
	beforeEach(function() {
		nclistGen = new GFF3toJbrowseJson();

		// fixtures to test making jbrowse json from parsed GFF3
		parsedGFF3toJbrowseJsonInput = { 'parsedData': {'ID':'maker-Group1%2E33-pred_gff_GNOMON-gene-4.137','data': ['Group1.33','maker','gene','245454','247006','.','+','.','ID=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=maker-Group1%252E33-pred_gff_GNOMON-gene-4.137'],'children': [ {'ID':'1:gnomon_566853_mRNA','data':['Group1.33','maker','mRNA','245454','247006','.','+','.','ID=1:gnomon_566853_mRNA;Parent=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=gnomon_566853_mRNA;_AED=0.45;_eAED=0.45;_QI=138|1|1|1|1|1|4|191|259'],'children':[{'ID':'1:gnomon_566853_mRNA:exon:5976','data':['Group1.33','maker','exon','245454','245533','.','+','.','ID=1:gnomon_566853_mRNA:exon:5976;Parent=1:gnomon_566853_mRNA'],'children':[],},{'ID':'1:gnomon_566853_mRNA:exon:5977', 'data': ['Group1.33','maker','exon','245702','245879','.','+','.','ID=1:gnomon_566853_mRNA:exon:5977;Parent=1:gnomon_566853_mRNA'], 'children':[],} ]}]}};
		expectedJbrowseJsonOutput = { // just putting this here for reference, I'm going to check most items in this struct manually below
			"histograms" : {
			    "stats" : [ {
				    "basesPerBin" : "1000000",
				    "max" : 1,
				    "mean" : 1
				} ],
			    "meta" : [ {
				    "basesPerBin" : "1000000",
				    "arrayParams" : {
					"length" : 1,
					"chunkSize" : 10000,
					"urlTemplate" : "hist-1000000-{Chunk}.json"
				    }
				} ]
			},
			"featureCount" : 1,
			"intervals" : {
			    "nclist" : [ 
					[ 0, 0, 14, -1, "maker", null, "mRNA", null, "x0", "x0", 
					  [ [ 1, 0, 3, -1, null, null, "exon", null, "p0", "p0", null ], 
					    [ 1, 6, 9, -1, null, null, "exon", null, null, null, null ], 
					    [ 1, 12, 14, -1, null, null, "exon", null, null, null, null ], 
					    [ 1, 0, 14, -1, null, null, "wholeCDS", null, null, null, null ] 
					    ] ]
					 ],
			    "classes" : [ {
				    "isArrayAttr" : {
					"Subfeatures" : 1
				    },
				    "attributes" : [ "Start", "End", "Strand", "Source", "Phase", "Type", "Score", "Id", "Name", "Subfeatures" ]
				}, {
				    "isArrayAttr" : {
				    },
				    "attributes" : [ "Start", "End", "Strand", "Source", "Phase", "Type", "Score", "Id", "Name", "Subfeatures" ]
				}, {
				    "isArrayAttr" : {
					"Sublist" : 1
				    },
				    "attributes" : [ "Start", "End", "Chunk" ]
				} ],
			    "maxEnd" : 247006,
			    "count" : 1,
			    "lazyClass" : 2,
			    "urlTemplate" : "lf-{Chunk}.json",
			    "minStart" : 245453
			},
			"formatVersion" : 1
		    };

		actualJbrowseJsonOutput = nclistGen.gff3toJbrowseJson(parsedGFF3toJbrowseJsonInput); 

	    });
	
	it("should respond to gff3toJbrowseJson", function() {
		expect(nclistGen.gff3toJbrowseJson).toBeDefined();
	    });

	it("should correctly set histograms/stats/meta in jbrowse json", function() {
		expect(actualJbrowseJsonOutput["histograms"]).toEqual({"stats" : [ {"basesPerBin" : "1000000","max" : 1,"mean" : 1} ],"meta" : [ { "basesPerBin" : "1000000", "arrayParams" : { "length" : 1, "chunkSize" : 10000, "urlTemplate" : "hist-1000000-{Chunk}.json"}}]});
	    });

	it("should correctly set featureCount in jbrowse json", function() {
		expect(actualJbrowseJsonOutput["featureCount"]).toEqual(1);
	    });
	
        it("should correctly set ['intervals']['nclist'] in jbrowse json", function() {
		expect(actualJbrowseJsonOutput["intervals"]["nclist"]).toEqual(
			       [0, 245454, 247006, "+", "maker", ".", "mRNA", ".", "1:gnomon_566853_mRNA", "gnomon_566853_mRNA", 
				[ [ 1, 0, 245454, 245533, "+", "maker", ".", "exon", ".", "1:gnomon_566853_mRNA:exon:5976", null],
				  [ 1, 0, 245702, 245879, "+", "maker", ".", "exon", ".", "1:gnomon_566853_mRNA:exon:5977", null] ] ]
									       );
	    });

	it("should correctly set ['intervals']['classes'] in jbrowse json", function() {
		expect(actualJbrowseJsonOutput["intervals"]["classes"]).toEqual(
		   [ {
				    "isArrayAttr" : {
					"Subfeatures" : 1
				    },
				    "attributes" : [ "Start", "End", "Strand", "Source", "Phase", "Type", "Score", "Id", "Name", "Subfeatures" ]
				}, {
				    "isArrayAttr" : {
				    },
				    "attributes" : [ "Start", "End", "Strand", "Source", "Phase", "Type", "Score", "Id", "Name", "Subfeatures" ]
				}, {
				    "isArrayAttr" : {
					"Sublist" : 1
				    },
				    "attributes" : [ "Start", "End", "Chunk" ]
					} ]);

	    });

	it("should correctly set ['intervals']['maxEnd'] in jbrowse json", function() {
		expect(actualJbrowseJsonOutput["intervals"]["maxEnd"]).toEqual( 245879 );
	    });
	it("should correctly set ['intervals']['count'] in jbrowse json", function() {
		expect(actualJbrowseJsonOutput["intervals"]["count"]).toEqual( 1 )
    	    });

	it("should correctly set ['intervals']['lazyClass'] in jbrowse json", function() {
		expect(actualJbrowseJsonOutput["intervals"]["lazyClass"]).toEqual(2)
		    });
	
	it("should correctly set ['intervals']['urlTemplate'] in jbrowse json", function() {
		expect(actualJbrowseJsonOutput["intervals"]["urlTemplate"]).toEqual("lf-{Chunk}.json");
	    });
	
	it("should correctly set ['intervals']['minStart'] in jbrowse json", function() {
		expect(actualJbrowseJsonOutput["intervals"]["minStart"]).toEqual( 245454 );
	    });
	
	it("should correctly set formatVersion in jbrowse json", function() {
		expect(actualJbrowseJsonOutput["formatVersion"]).toEqual(1);
	    });

    });

