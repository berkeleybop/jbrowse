define([
           'dojo/_base/declare',
           'JBrowse/View/Track/Alignments',
           'WebApollo/View/Track/DraggableHTMLFeatures', 
           'JBrowse/Util', 
       ],
       function(
           declare,
           AlignmentsTrack,
           DraggableTrack, 
           Util
       ) {

return declare([ DraggableTrack, AlignmentsTrack ], {
    _defaultConfig: function()  {
        var thisConfig = Util.deepUpdate(
//       return Util.deepUpdate(
            dojo.clone( this.inherited(arguments) ),
            {
                layoutPitchY: 2, 
                subfeatures: true,
                style: {
                    className: "bam-read", 
                    renderClassName: null, 
                    arrowheadClass: "arrowhead", 
	            centerChildrenVertically: false, 
	            showSubfeatures: true, 
	            showMismatches: false, 
                    subfeatureClasses: {
	                M: "cigarM", 
		        D: "cigarD",
		        N: "cigarN",
		        E: "cigarEQ",  /* "=" converted to "E" in BAM/LazyFeature subfeature construction */
		        X: "cigarX", 
		        I: "cigarI"
                    }
                }
            }
        );
        return thisConfig;
    }

} );

});