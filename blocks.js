/**

@module serocash:blocks
*/

/**
The SeroBlocks collection, with some serocash additions.

@class SeroBlocks
@constructor
*/



SeroBlocks = new Mongo.Collection('serocash_blocks', {connection: null});

// if(typeof PersistentMinimongo !== 'undefined')
//     new PersistentMinimongo(SeroBlocks);

/**
Gives you reactively the lates block.

@property latest
*/
Object.defineProperty(SeroBlocks, 'latest', {
    get: function () {
        return SeroBlocks.findOne({}, {sort: {number: -1}}) || {};
    },
    set: function (values) {
        var block = SeroBlocks.findOne({}, {sort: {number: -1}}) || {};
        values = values || {};
        SeroBlocks.update(block._id, {$set: values});
    }
});

/**
Stores all the callbacks

@property _forkCallbacks
*/
SeroBlocks._forkCallbacks = [];

/**
Start looking for new blocks

@method init
*/
SeroBlocks.init = function(){
    if(typeof web3 === 'undefined') {
        console.warn('SeroBlocks couldn\'t find web3, please make sure to instantiate a web3 object before calling SeroBlocks.init()');
        return;
    }

    // clear current block list
    SeroBlocks.clear();

    Tracker.nonreactive(function() {
        observeLatestBlocks();
    });
};

/**
Add callbacks to detect forks

@method detectFork
*/
SeroBlocks.detectFork = function(cb){
    SeroBlocks._forkCallbacks.push(cb);
};

/**
Clear all blocks

@method clear
*/
SeroBlocks.clear = function(){
    _.each(SeroBlocks.find({}).fetch(), function(block){
        SeroBlocks.remove(block._id);
    });
};

/**
The global block subscription instance.

@property subscription
*/
var subscription = null;

/**
Update the block info and adds additional properties.

@method updateBlock
@param {Object} block
*/
function updateBlock(block){

    // reset the chain, if the current blocknumber is 100 blocks less 
    if(block.number + 10 < SeroBlocks.latest.number)
        SeroBlocks.clear();

    block.difficulty = block.difficulty.toString(10);
    block.totalDifficulty = block.totalDifficulty.toString(10);

    web3.sero.getGasPrice(function(e, gasPrice){
        if(!e) {
            block.gasPrice = gasPrice.toString(10);
            SeroBlocks.upsert('bl_'+ block.hash.replace('0x','').substr(0,20), block);
        }
    });
};

/**
Observe the latest blocks and store them in the Blocks collection.
Additionally cap the collection to 50 blocks

@method observeLatestBlocks
*/
function observeLatestBlocks(){

    // get the latest block immediately
    web3.sero.getBlock('latest', function(e, block){
        if(!e) {
            updateBlock(block);
        }
    });

    // GET the latest blockchain information
    filter = web3.sero.filter('latest').watch(checkLatestBlocks);

  // GET the latest blockchain information
  // subscription = web3.sero.subscribe("newBlockHeaders", function(error, result) {
  //   checkLatestBlocks(error, result ? result.hash : null);
  // });
}

/**
The observeLatestBlocks callback used in the block subscription.

@method checkLatestBlocks
*/
var checkLatestBlocks = function(e, hash){
    if(!e) {
        web3.sero.getBlock(hash, function(e, block){
            if(!e) {
                var oldBlock = SeroBlocks.latest;

                // console.log('BLOCK', block.number);

                // if(!oldBlock)
                //     console.log('No previous block found: '+ --block.number);

                // CHECK for FORK
                if(oldBlock && oldBlock.hash !== block.parentHash) {
                    // console.log('FORK detected from Block #'+ oldBlock.number + ' -> #'+ block.number +'!');

                    _.each(SeroBlocks._forkCallbacks, function(cb){
                        if(_.isFunction(cb))
                            cb(oldBlock, block);
                    });
                }

                updateBlock(block);

                // drop the 50th block
                var blocks = SeroBlocks.find({}, {sort: {number: -1}}).fetch();
                if(blocks.length >= 5) {
                    var count = 0;
                    _.each(blocks, function(bl){
                        count++;
                        if(count >= 5)
                            SeroBlocks.remove({_id: bl._id});
                    });
                }
            }
        });

    // try to re-create the filter on error
    // TODO: want to do this?
    } else {
        filter.stopWatching();
        filter = web3.sero.filter('latest').watch(checkLatestBlocks);
    }
};
