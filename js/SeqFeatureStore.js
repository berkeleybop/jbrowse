//MODEL

/**
 * Base class for JBrowse data backends that hold sequences and
 * features.  Some aspects reminiscent of Lincoln Stein's
 * Bio::DB::SeqFeature::Store.
  *
 * @class
 * @extends Store
 * @constructor
 */

function SeqFeatureStore(args) {
    Store.call(this, args);

    if( !args ) return;

    if (args.loaded) {
        this.loaded  = args.loaded;
    }
    if (args.changed) {
        this.changed = args.changeCallback;
    }
};

SeqFeatureStore.prototype = new Store('');
