describe("GFF3toNCList", function() { 
	// GFF3toNclist takes a data structure such as that returned by GFF3toJson.js 
	// and makes it into an nested containment list suitable for use in 
	// WebApollo and possibly Jbrowse. 
	
	beforeEach(function() {
		nclistGen = new GFF3toNCList();
		parsedGff3Struct = "";
	    });
	
	it("should respond to makeNCList", function() {
		expect(nclistGen.makeNCList).toBeDefined();
	    });
	
    });

