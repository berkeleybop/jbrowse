describe("JSONUtils", function() { 
	/*
	   JSONUtils was made by Gregg/Ed to manipulate JSON data structures, especially to coerce various
	   kinds of JSON into JSON suitable for using with jbrowse or Webapollo. 
	   JR added this spec file in 10/2012 to test convertParsedGFF3JsonToFeatureArray(), but we can add tests 
	   for the other stuff in JSONUtils later too. 

	   convertParsedGFF3JsonToFeatureArray()
	   takes one feature and all of its subfeatures (children/grandchildren/great-grandchildren/...) from 
	   a parsed GFF3 data struct (returned from GFF3toJson()), and returns a a two-level feature array for 
	   the lowest and next-lowest level. For example, given a data struct for a parsed gene/mRNA/exon GFF3
	   it would return a two-level feature array for the mRNA and all of it's exons. 

	   An example of input fixture is in fixtures/parsedGff3Json2FeatureArrayTest.parsedGff3Json
	   An example of expected output is in fixtures/parsedGff3Json2FeatureArrayTest.featureArray
	   
	   Both are basically the same as what's used in the tests below.
        */

	var jsonUtil; 
	var parsedGFF3StringInput, expectedFeatureArrayOutput, featureArrayOutput;

	beforeEach(function() {
		jsonUtil = new JSONUtils();

		parsedGFF3StringInput = { 'parsedData': {'ID':'maker-Group1%2E33-pred_gff_GNOMON-gene-4.137','data': ['Group1.33','maker','gene','245454','247006','.','+','.','ID=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=maker-Group1%252E33-pred_gff_GNOMON-gene-4.137'],'children': [ {'ID':'1:gnomon_566853_mRNA','data':['Group1.33','maker','mRNA','245454','247006','.','+','.','ID=1:gnomon_566853_mRNA;Parent=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;Name=gnomon_566853_mRNA;_AED=0.45;_eAED=0.45;_QI=138|1|1|1|1|1|4|191|259'],'children':[{'ID':'1:gnomon_566853_mRNA:exon:5976','data':['Group1.33','maker','exon','245454','245533','.','+','.','ID=1:gnomon_566853_mRNA:exon:5976;Parent=1:gnomon_566853_mRNA'],'children':[],},{'ID':'1:gnomon_566853_mRNA:exon:5977', 'data': ['Group1.33','maker','exon','245702','245879','.','+','.','ID=1:gnomon_566853_mRNA:exon:5977;Parent=1:gnomon_566853_mRNA'], 'children':[],} ]}]}};

		expectedFeatureArrayOutput = [0, "245454", "247006", "+", "maker", ".", "mRNA", ".", "1:gnomon_566853_mRNA", "gnomon_566853_mRNA", 
    [ [ 1, 0, "245454", "245533", "+", "maker", ".", "exon", ".", "1:gnomon_566853_mRNA:exon:5976", null],
      [ 1, 0, "245702", "245879", "+", "maker", ".", "exon", ".", "1:gnomon_566853_mRNA:exon:5977", null] ] ];

		featureArrayOutput = jsonUtil.convertParsedGFF3JsonToFeatureArray( parsedGFF3StringInput );

	    });

	it("should respond to convertParsedGFF3JsonToFeatureArray", function() {
		expect(jsonUtil.convertParsedGFF3JsonToFeatureArray).toBeDefined();
	});

	it("should return an array", function() {
		expect(featureArrayOutput).toBeDefined();
	});

	// test parent (mRNA in this case)
	it("should set first field feature array to 0", function() {
		expect(featureArrayOutput[0]).toEqual(0);
	});

	it("should correctly set parent's Start/End/Strand/Source/Phase/Type/Score/Id/Name", function() {
		expect(featureArrayOutput[1]).toEqual(245454); // Start
		expect(featureArrayOutput[2]).toEqual(247006); //End
		expect(featureArrayOutput[3]).toEqual("+"); //Strand
		expect(featureArrayOutput[4]).toEqual("maker"); //Source
		expect(featureArrayOutput[5]).toEqual("."); //Phase
		expect(featureArrayOutput[6]).toEqual("mRNA"); //Type
		expect(featureArrayOutput[7]).toEqual("."); //Score
		expect(featureArrayOutput[8]).toEqual("1:gnomon_566853_mRNA"); //Id
		expect(featureArrayOutput[9]).toEqual("gnomon_566853_mRNA"); //Name
	    });

    });

