describe("GFF3toJson", function() { 
	// GFF3toJson takes a GFF3 URL and converts it to an array of hash refs where each
	// hash has a "parent" key/value pair and zero or more "children" key/value pairs, 
	// and the children in turn can have more parent/children. 
	var gff3Parser;
	var makerGff3;
	var makerCorrectJsonFile;
	
	beforeEach(function() {
		jasmine.getFixtures().fixturesPath = './fixtures/';
		gff3Parser = new GFF3toJson();		
		makerGff3 = '/Users/jtr4v/projects/apollo-web/apollo-web_jbrowse/tests/js_tests/webapollo_specs/fixtures/Group1.33_Amel_4.5.maker.gff';
	    });

	it('should load my fixtures', function () {
		//var gffString = jasmine.read( "Group1.33_Amel_4.5.maker.gff" );
		loadFixture( "Group1.33_Amel_4.5.maker.gff" );
		expect(gffString.toBeDefined() );
	    });
	
	it("1 should be true", function() {
		expect(1).toBeTruthy();
	    });
	
	it("should respond to parse", function() {
		expect(gff3Parser.parse).toBeDefined();
	    });
	
	it("should correctly parse Maker GFF3 file to json", function() {
		var actualJson = gff3Parser.parse( makerGff3 );
		var expectedJson = [{"parent":
				     ["Group1.33","maker","gene","245454","247006",".","+",".","ID=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=maker-Group1%252E33-pred_gff_GNOMON-gene-4.137"],
				     "children": 
				     [{
					     "parent": 
					     ["Group1.33","maker","mRNA","245454","247006",".","+",".","ID=1:gnomon_566853_mRNA;Parent=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=gnomon_566853_mRNA;_AED=0.45;_eAED=0.45;_QI=138|1|1|1|1|1|4|191|259"],
					     "children": [
							  ["Group1.33","maker","exon","245454","245533",".","+",".","ID=1:gnomon_566853_mRNA:exon:5976;Parent=1:gnomon_566853_mRNA"],
							  ["Group1.33","maker","exon","245702","245879",".","+",".","ID=1:gnomon_566853_mRNA:exon:5977;Parent=1:gnomon_566853_mRNA"]]}]}
		    ];
		
		expect(actualJson).toEqual( expectedJson );
	    });
	
    });