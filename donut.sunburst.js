(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// version 0.5.1 ([source](https://github.com/aaronj1335/t-js))
//
// t-js is freely distributable under the MIT license
//
// <a href="https://travis-ci.org/aaronj1335/t-js" target=_blank>
//   <img src="https://api.travis-ci.org/aaronj1335/t-js.png?branch=master">
// </a>
//

// overview
// ========
// t.js is a tree-traversal library.  its only assumption is that the trees it
// traverses are made up of objects with 'children' arrays:
//
//      {
//          children: [
//              { },
//              {
//                  children: [
//                      { },
//                      { }
//                  ]
//              }
//          ]
//      }
//
//  the actual property name is configurable. the traversals are entirely
//  non-recursive, including the post-order traversal and `map()` functions,
//  and it works inside the browser or out.
//
// testing
// -------
// there's a bunch of tests in `test/test.js`. you can run them along with the
// linter with:
//
//     $ npm install && npm test
//
// or view them on most any system with a modern browser by opening the
// `index.html` file.
//
// documentation is generated with the `grunt docs` target.
//
// (function() {


// usage
// -----
// the `t` interface is exported in either the browser or node.js. the library
// can be installed from [npm](http://search.npmjs.org/#/t):
//
//     $ npm install t
//
var _dfsPostOrder,
    t = {},
    root = this,
    isArray = function(o) {
        return Object.prototype.toString.call(o) === '[object Array]';
    },
    getChildrenName = function (config) {
        return config.childrenName || 'children';
    };

if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports)
        exports = module.exports = t;
    exports.t = t;
} else {
    root.t = t;
}


// available functions
// ===================

// t.bfs()
// -------
// perform a breadth-first search, executing the given callback at each node.
//
//      t.bfs(node, [config], function(node, par, ctrl) {
//          /* ... */
//      })
//
// - `node`:
//      object where the search will start.  this could also be an array of
//      objects
// - `config`:
//      you can define the name of the children property with
//      `config.childrenName` (shoutout to @GianlucaGuarini)
// - `callback` (last argument):
//      function to be executed at each node.  the arguments are:
//      - `node`: the current node
//      - `par`: the current node's parent
//      - `ctrl`: control object.  this doesn't currently do anything.
//
//  returns: the first `node` argument
//


t.bfs = function(node) {

    var cur, ctrl, callback, i, length, par, children,
        isConfigSet = arguments.length === 3,
        config = isConfigSet ? arguments[1] : {},
        queue = isArray(node)? node.slice(0) : [node],
        parents = [undefined],
        childrenName = getChildrenName(config);

    if (node == null) return node;

    if (arguments.length >= 3) {
        config = arguments[1];
        callback = arguments[2];
    } else {
        config = {};
        callback = arguments[1];
    }

    while (queue.length) {
        cur = queue.shift();
        par = parents.shift();
        ctrl = {}
        callback.call(cur, cur, par, ctrl);

        if ( ctrl.stop ) break;

        children = cur[childrenName] || [];
        for (i = 0, length = children.length; i < length; i++) {
            queue.push(children[i]);
            parents.push(cur);
        }
    }

    return node;
};

// t.dfs()
// -------
// perform a depth-first search, executing the given callback at each node.
//
//      t.dfs(node, [config], function(node, par, ctrl) {
//          /* ... */
//      })
//
//  in the pre-order case, `dfs()` doesn't process child nodes until after the
//  callback.  so if you need to traverse an unknown tree, say a directory
//  structure, you can start with just the root, and add child nodes as you go
//  by appending them to `this.children` in the callback function.
//
// - `node`:
//      object where the search will start.  this could also be an array of
//      objects
// - `config`:
//      if this is an object w/ the 'order' property set to 'post', a
//      post-order traversal will be performed.  this is generally worse
//      performance, but the `callback` has access to the return values of its
//      child nodes. you can define the name of the children property with
//      `config.childrenName`
// - `callback` (last argument):
//      function to be executed at each node.  the arguments are:
//      - `node`: the current node
//      - `par`: the current node's parent
//      - `ctrl`: control object.  setting the `stop` property of this will end
//      the search, setting the `cutoff` property of this will not visit any
//      children of this node
//      - `ret`: return values of child nodes.  this is only set if `dfs()` is
//      called with the `order` property set to `post`.
//
//  returns: the first `node` argument
//
t.dfs = function(node) {
    var cur, par, children, ctrl, i, ret,
        isConfigSet = arguments.length === 3,
        nodes = isArray(node)? node.slice(0).reverse() : [node],
        config = isConfigSet ? arguments[1] : {},
        callback = arguments[isConfigSet ? 2 : 1],
        parents = [],
        childrenName = getChildrenName(config);
    if (typeof nodes[0] === 'undefined' && nodes.length === 1) return;

    if (config.order === 'post') {
        ret = _dfsPostOrder(nodes, config, callback);
        return isArray(node)? ret : ret[0];
    }


    for (i = nodes.length-1; i >= 0; i--)
        parents.push(undefined);

    while (nodes.length > 0) {
        cur = nodes.pop();
        par = parents.pop();

        ctrl = {};
        callback.call(cur, cur, par, ctrl);

        if (ctrl.stop) break;

        children = (cur && cur[childrenName])? cur[childrenName] : [];

        for (i = ctrl.cutoff? -1 : children.length-1; i >= 0; i--) {
            nodes.push(children[i]);
            parents.push(cur);
        }
    }

    return node;
};

// t.map()
// -------
// given a tree, return a tree of the same structure made up of the objects
// returned by the callback which is executed at each node.  think of the
// `underscore`'s `_.map()` function, or python's `map()`
//
//      t.map(node, [config], function(node, par) {
//          /* ... */
//      })
//
// - `node`:
//      object where the traversal will start.  this could also be an array of
//      objects
// - `config`:
//      you can define the name of the children property with
//      `config.childrenName`
// - `callback` (last argument):
//      function to be executed at each node.  this must return an object.  the
//      `map` function takes care of setting children.  the arguments are:
//      - `node`: the current node
//      - `par`: the current node's parent. note that this is the parent from
//      the new tree that's being created.
//
//  returns: a new tree, mapped by the callback function
//
t.map = function() {
    var node = arguments[0],
        isConfigSet = arguments.length === 3,
        config = isConfigSet ? arguments[1] : {},
        filter = config.filter,
        nodeFactory = arguments[isConfigSet ? 2 : 1],
        ret = isArray(node)? [] : undefined,
        last = function(l) { return l[l.length-1]; },
        parentStack = [],
        childrenName = getChildrenName(config);

    t.dfs(node, config, function(n, par, ctrl) {
        var curParent = last(parentStack),
            newNode = nodeFactory(n, curParent? curParent.ret : undefined);

        if (filter && ! newNode) {
            ctrl.cutoff = true;
            if (curParent && n === last(curParent.n[childrenName])) {
                parentStack.pop();
                if (curParent.ret[childrenName] &&
                        ! curParent.ret[childrenName].length)
                    delete curParent.ret[childrenName];
            }
            return;
        }

        if (! par) {
            if (isArray(node))
                ret.push(newNode);
            else
                ret = newNode;

        } else {
            curParent.ret[childrenName].push(newNode);

            if (n === last(curParent.n[childrenName])) {
                parentStack.pop();
                if (curParent.ret[childrenName] &&
                        ! curParent.ret[childrenName].length)
                    delete curParent.ret[childrenName];
            }
        }

        if (n[childrenName] && n[childrenName].length) {
            newNode[childrenName] = [];
            parentStack.push({n: n, ret: newNode});
        }
    });

    return ret;
};

// t.filter()
// ----------
// given a tree, return a tree of the same structure made up of the objects
// returned by the callback which is executed at each node.  if, however, at a
// given node the callback returns a falsy value, then the current node and all
// of its descendents will be pruned from the output tree.
//
//      t.filter(node, [config], function(node, par) {
//          /* ... */
//      })
//
// - `node`:
//      object where the traversal will start.  this could also be an array of
//      objects
// - `config`:
//      you can define the name of the children property with
//      `config.childrenName`
// - `callback` (last argument):
//      function to be executed at each node.  this must return an object or a
//      falsy value if the output tree should be pruned from the current node
//      down.  the `filter` function takes care of setting children.  the
//      arguments are:
//      - `node`: the current node
//      - `par`: the current node's parent. note that this is the parent from
//      the new tree that's being created.
//
// returns: a new tree, filtered by the callback function
//
t.filter = function(node) {
    var isConfigSet = arguments.length === 3,
        nodeFactory =  arguments[isConfigSet ? 2 : 1],
        config = isConfigSet ? arguments[1] : {};
    return t.map(node, {
        filter: true,
        childrenName: config.childrenName
    }, nodeFactory);
};

// t.stroll()
// ----------
//
// _a walk through the trees..._
//
// given two trees of similar structure, traverse both trees at the same time,
// executing the given callback with the pair of corresponding nodes as
// arguments.
//
//      t.stroll(tree1, tree2, [config], function(node1, node2) {
//          /* ... */
//      })
//
// - `tree1`:
//      the first tree of the traversal
// - `node2`:
//      the second tree of the traversal
// - `config`:
//      you can define the name of the children property with
//      `config.childrenName`
// - `callback` (last argument):
//      function to be executed at each node. the arguments are:
//      - `node1`: the node from the first tree
//      - `node2`: the node from the second tree
//
t.stroll = function(tree1, tree2) {
    var i, node2,
        isConfigSet = arguments.length === 4,
        callback =  arguments[ isConfigSet ? 3 : 2],
        config = isConfigSet ? arguments[2] : {},
        childrenName = getChildrenName(config),
        nodes2 = isArray(tree2)? tree2.slice(0).reverse() : [tree2],
        len = function(a) { return typeof a === 'undefined'? 0 : a.length; };

    t.dfs(tree1, config, function(node1, par, ctrl) {
        node2 = nodes2.pop();

        callback(node1, node2);

        if (node1 && node2 &&
                len(node1[childrenName]) === len(node2[childrenName]))
            for (i = (node2[childrenName] || []).length-1; i >= 0; i--)
                nodes2.push(node2[childrenName][i]);
        else
            ctrl.cutoff = true;

    });
};

// t.find()
// ----------
//
// given a tree and a truth test, return the first node that responds with a
// truthy value
//
//      t.find(tree, [config], function(node, par) {
//          /* ... */
//      })
//
// - `tree`:
//      the tree in which to find the node
// - `config`:
//      you can define the name of the children property with
//      `config.childrenName`
// - `callback` (last argument):
//      function to be executed at each node. if this function returns a truthy
//      value, the traversal will stop and `find` will return the current node.
//      the arguments are:
//      - `node`: the current node
//      - `par`: the parent of the current node
//
// returns: the found node
//
t.find = function( tree ) {
    var found,
        isConfigSet = arguments.length === 3,
        callback =  arguments[ isConfigSet ? 2 : 1],
        config = isConfigSet ? arguments[1] : {};
    t.dfs(tree, config, function(node, par, ctrl) {
        if (callback.call(node, node, par)) {
            ctrl.stop = true;
            found = this;
        }
    });

    return found;
};

// _dfsPostOrder()
// -----------------
//
// this is a module-private function used by `dfs()`
_dfsPostOrder = function(nodes, config, callback) {
    var cur, par, ctrl, node,
        last = function(l) { return l[l.length-1]; },
        ret = [],
        stack = [{
            node: nodes.pop(),
            index: 0,
            ret: []
        }],
        childrenName = getChildrenName(config);

    while (stack.length) {
        cur = last(stack);
        node = cur.node;

        if (node[childrenName] && node[childrenName].length) {
            if (cur.index < node[childrenName].length) {
                stack.push({
                    node: node[childrenName][cur.index++],
                    index: 0,
                    ret: []
                });
                continue;
            }
        }

        ctrl = {};
        par = stack[stack.length-2];
        if (par) {
            par.ret.push(callback.call(node, node, par.node, ctrl, cur.ret));
            stack.pop();
        } else {
            ret.push(callback.call(node, node, undefined, ctrl, cur.ret));
            stack.pop();
            if (nodes.length)
                stack.push({
                    node: nodes.pop(),
                    index: 0,
                    ret: []
                });
        }
    }

    return ret;
};

// }());
module.exports = t;
},{}],2:[function(require,module,exports){
(function (global){
/*  Chase Miller (2015-2016) */

// Grab an existing iobio namespace object, or create a blank object
// if it doesn't exist
var iobio = global.iobio || {};
global.iobio = iobio;

// Defaults
var binnerData = [],
    binnerClassifiedData = [],
    sunburstD3 = require('./sunburst.d3.js'),
    donutD3 = require('./donut.d3.js'),
    t = require('../lib/t.js');

// Add custom click to fix issue w/ D3
$.fn.d3Click = function () {
  this.each(function (i, e) {
    var evt = document.createEvent("MouseEvents");
    evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);

    e.dispatchEvent(evt);
  });
};

global.iobio.donutSunburst = function(div, pieChartCallback ) {
  this.cmd;
  this.pieChartCallback = pieChartCallback;
  // create binner html
  $(div).append("<div id='big-binner' class='results'><div id='b'></><div style='clear:both'></div></div>")
  var $bigBinner = $('#big-binner');
  this.bigBinnerElem = $bigBinner[0];
  var h = $bigBinner.height();
  var w = h + 120;
  $bigBinner.css('width', w + 'px')
  $bigBinner.css('height', h + 'px')
  $bigBinner.css('left', 'calc(50% - ' + w/2 + 'px)');
  $('#big-binner #b').append("<svg id='big-binner-binner' viewbox='0 0 " + w + " " + h + "'  preserveAspectRatio='xMidYMid' style='margin-top:20px' ></svg>");
  this.bigBinnerBinnerElem = $('#big-binner-binner')[0];

  // create sunburst html
  $(div).append("<div id='main-viz' class='results'><div id='selected-name'>All</div><div id='viz'></div><div id='reads-viewed'><h4 id='total-reads'>Total <span id='bin'></span> Reads Classified: <span class='iobio-txt-color'></span></h4><div style='clear:both'></div></div></div>")
  var $mainViz = $('#main-viz');
  this.mainViz = $mainViz[0];

  // create error message
  $(div).append("<div id='no-results' style='display:none'><div>Oops there was an error</div><div>Please try again and make sure your file or url is valid</div></div>")

  this.sunburstElem = $('#viz')[0];
  var w = h + 12;
  $mainViz.css('width', w + 'px')
  $mainViz.css('height', h + 'px')
  $mainViz.css('left', 'calc(50% - ' + w/2 + 'px)');
  $(this.sunburstElem).append("<svg id='sunburst-chart' viewbox='0 0 " + w + " " + h + "'  preserveAspectRatio='xMidYMid' style='margin-top:20px' ></svg>");
  $(this.sunburstElem).append("<div id='bar-chart'></div>");
  $('#big-binner').css('visibility', 'hidden');
  $('#main-viz').css('visibility', 'hidden');
  // set attributes
  // create svg
}


global.iobio.donutSunburst.prototype.goObj = function(data) {
    this.go(data, { data:true });
}


global.iobio.donutSunburst.prototype.go = function(data, options) {
  options = options || {};
  this.ignoreData = false;
  var self = this;
  var sunburstElem = this.sunburstElem;
  var bigBinnerElem = this.bigBinnerElem;

  $('#big-binner').css('visibility', 'hidden');
  $('#main-viz').css('visibility', 'hidden');
  self.mode = 'binner';

  // create charts
  var commaFormatter = d3.format(",0f");
  var radiusBig = $('#big-binner-binner').height()/2;
  var binnerColor = d3.scale.ordinal()
        .domain(['bacterial', 'fungal', 'human', 'viral', 'unknown', 'ambiguous', 'phage', 'phix'])
        .range(['#e31b00','#0081f3', '#003F78', '#83338F', 'rgb(120,120,120)', '#A7AAB3', '#008C26', '#06ac61'])

  self.bigBinnerChart = donutD3()
        .radius(radiusBig-40)
        .thickness(radiusBig)
        .klass("binnerArc")
        .click(function(d) { self.toSunburst(d.name) })
        .color(function(d) {   return binnerColor(d.data.name); })
        .tooltip(function(d, total) {
          var percent = parseInt(d.value / total * 1000) / 10;
          return d.data.name + ' binned: ' + commaFormatter(d.value) + ' (' + percent + '%)';
        });
  self.bigBinnerClassifiedChart = donutD3()
        .radius(radiusBig-20)
        .thickness(20)
        .klass("binnerClassArc")
        .click(function(d) { self.toSunburst(d.name) })
        .color(function(d) {   if(d.data.type=='binner') {return 'white'} else {return binnerColor(d.data.name);} })
        .tooltip(function(d) { return d.data.name.split('-')[0] + ' classified: ' + commaFormatter(d.value) });
  self.binnerPie = d3.layout.pie().sort(function(a,b) { return d3.ascending(a.name,b.name); }).value(function(d) { return d.count});

  var h = $(sunburstElem).find('svg').height();
  var w  = $(sunburstElem).find('svg').width();
  self.sunburstChart = sunburstD3()
      .width( w )
      .height( h )
      .clickBefore( function(currRoot) {
        self.updateBreadcrumbs(currRoot);
        $('#selected-name').html( currRoot.name.split(':')[1] == 'root' ? currRoot.children[0].name : currRoot.name );
      });

  self.options = options;
  var commaFormat = d3.format("0,000");
  displayData(data);


  function displayData (data) {
    $('#sunburst-spinner').css('display', 'none')
    // transform binner data
    binnerData = [];
    binnerClassifiedData = [];
    var total = 0;
    if (data.binnerResult['phage'] == undefined) data.binnerResult['phage'] = 0;
    Object.keys(data.binnerResult).forEach(function(key){

      if (key == 'unclassified') {
          binnerData.push( {name:'unknown', count:data.binnerResult[key]} );
      } else {
        binnerData.push( {name:key, count:data.binnerResult[key]} );
      }
      // gather data for classified portion of binner pie chart
      if (data.classifierResult[key] != undefined) {
        var cCount = data.classifierResult[key].count || 0;
        binnerClassifiedData.push( {name: key, count: cCount, type:'classified'});
        binnerClassifiedData.push( {name:key+'-binner', count:data.binnerResult[key]-cCount, type:'binner'} );
      } else {
        if (key == 'unclassified')
          binnerClassifiedData.push( {name:'unknown-binner', count:data.binnerResult[key], type:'binner'} );
        else
          binnerClassifiedData.push( {name:key+'-binner', count:data.binnerResult[key], type:'binner'} );
      }
      total += data.binnerResult[key]
    })


    // update metrics
    $('#reads-sampled .metric').html(numberFormatter(total));

    if (total == 0 || (total ==1 && data.binnerResult.unclassified)){
      total = 0;
      if (self.options && self.options.errorCallback) self.options.errorCallback("NO RESULTS");
      $('#iobio-viz #no-results').css('display', 'block');
      $('#iobio-viz').css('display', 'block');
      return;
    }
    else {$('#no-results').css('display', 'none')}

    // transform classifier data
    var classifierRoot = { 'name' : 'root', 'id' : 'root', 'count' : 0,  'children' : [] };
    Object.keys(data.classifierResult).forEach(function(key) {

      if (data.classifierResult[key].children != undefined) {
        if (data.classifierResult[key].children[0].children == undefined) {
          var root = data.classifierResult[key];
          classifierRoot.children.push( root );
        }
        else {
          var root = data.classifierResult[key].children[0];
          if (root.name == 'no rank:root' && root.children[0].name == 'no rank:cellular organisms' && root.count > root.children[0].count ) {
            root.count = root.children[0].count;
            // root = root.children[0];
          }
          classifierRoot.children.push( root );
        }
      }
      var count = data.classifierResult[key].count || 0;
      classifierRoot['count'] += count;
    })

    var rows = ['human', 'viral', 'bacterial', 'fungal', 'ambiguous', 'unclassified', 'phage', 'phix'];
    rows.forEach(function(key){
      var cCount = data.classifierResult[key] ? data.classifierResult[key].count : undefined;
      classifierRoot.children.forEach(function(cat) {
        if (cat.bin == key) // see if root for bin has been changed and if so take the changed root
          cCount = cat.count;
      })
      if (cCount == undefined) cCount = '';
      else cCount = ' (' + commaFormat(cCount) + ')'
      $('.' + key + '-binned-reads').html( commaFormat(data.binnerResult[key]) + cCount )
    });

    // update classified total
    $('#reads-classified .metric').html(numberFormatter(classifierRoot['count']));
    $('#percent-reads-classified .metric').html(d3.format('%')(classifierRoot['count']/total));

    self.rootData = JSON.parse(JSON.stringify(classifierRoot));

    // update correct chart
    if ( self.mode == 'binner') {
      $('#big-binner').css('visibility', 'visible');
      $('#main-viz').css('visibility', 'hidden');
      $('#sunburst-filters input').css('visibility', 'visible');
      self.drawBigBinnerChart(binnerData, binnerClassifiedData, {chartElem: self.bigBinnerBinnerElem})
    } else {
      $('#big-binner').css('visibility', 'hidden');
      $('#main-viz').css('visibility', 'visible');
      $('#sunburst-filters input').css('visibility', 'hidden');
      var currTopRoot = d3.select('#main-viz path').data()[0];
      var currH = treeToHash(currTopRoot, 'id');
      var newDataCurrRoot;
      t.bfs(self.rootData, [], function(node, par, ctrl) {
           if (node.id == currTopRoot.id && node.bin == currTopRoot.bin) {
             newDataCurrRoot = node;
             t.bfs(newDataCurrRoot, [], function(n, p, c) {
               if(currH[n.id] != undefined) {
                 n.x0 = currH[n.id].x0;
                 n.dx0 = currH[n.id].dx0;
               }
             });
             ctrl['stop'] = true;
           }
       })
      var fCount = $('#min-read-count-slider').val();
      if (fCount > 1)
        self.filterCount(fCount, newDataCurrRoot);
      else {
        var selection = d3.select(self.sunburstElem).select('svg').datum( newDataCurrRoot );
        self.sunburstChart(selection, {transitionDuration:200});
      }
      // update total reads in this bin
      var binCount = self.getBinRoot(newDataCurrRoot.bin);
      if (binCount == undefined) binCount = '';
      else binCount = binCount.count
      $('#total-reads .iobio-txt-color').html( binCount )
    }

  }
}



global.iobio.donutSunburst.prototype.drawBigBinnerChart = function(bData, classifiedData, options) {
  var self = this;

  $('#sunburst-top-controls').css('visibility', 'hidden');

  // select only the checked bins to draw
  options = options || {};
  var chartElem = options.chartElem || '#big-binner-binner';
  bData = bData || binnerData;
  classifiedData = classifiedData || binnerClassifiedData;
  var binnerDatatoDraw = [];
  $.extend(true, binnerDatatoDraw, bData)
  var classifiedDatatoDraw = [];
  $.extend(true, classifiedDatatoDraw, classifiedData)


  var notCheckedBins = $('#sunburst-filters input:not(:checked)').toArray();
  notCheckedBins.forEach(function(d) {
    var bin = d.getAttribute('data-bin');
    binnerDatatoDraw.forEach(function(b) { if (b.name == bin) b.count = 0; })
    classifiedDatatoDraw.forEach(function(c) { if (c.name.split('-')[0] == bin) c.count = 0; })
  })

  var bData = self.binnerPie(binnerDatatoDraw);
  var cData = self.binnerPie(classifiedDatatoDraw);

  var arcBig = d3.select(chartElem).selectAll(".binnerArc")
      .data(bData, function(d) { return d.data.name; });
  self.bigBinnerChart(arcBig, options);

  var arcClassifiedBig = d3.select(chartElem).selectAll(".binnerClassArc")
      .data(cData, function(d) { return d.data.name; });
  options.events = false;
  self.bigBinnerClassifiedChart(arcClassifiedBig, options);
}

global.iobio.donutSunburst.prototype.resetCheckButtons = function() {
  $('#sunburst-filters .btn-group input').prop('checked', true);
  $('#sunburst-filters button').prop('disabled', false);
}

global.iobio.donutSunburst.prototype.resetCatButtons = function() {
  $('#sunburst-filters .btn-group').removeClass('disable-filter');
}

global.iobio.donutSunburst.prototype.toSunburst = function(bin) {
  var self = this;
  var binNode = self.getBinRoot(bin);
  if (binNode == undefined)  {
    $('#no-classified-reads-modal #bin-category').html(bin);
    $('#no-classified-reads-modal').modal('show');
    this.resetCatButtons();
    return;
  }

  self.mode = 'sunburst';
  $('#min-abundance').css('visibility', 'visible');
  var selection = d3.select("#viz svg").datum(binNode);

  self.sunburstChart.clear();
  self.sunburstChart(selection);

  this.initBreadcrumbs(binNode.children[0]);
  // disable all buttons except this bin
  $('#sunburst-filters .btn-group:not(:has(.btn-'+bin+'-filter))').addClass('disable-filter');
  // hide all check boxes
  $('#sunburst-filters input').css('visibility', 'hidden');

  // drill into binner chart
  var data = [{"name":"viral","count":0},{"name":"unknown","count":0},{"name":"fungal","count":0},{"name":"bacterial","count":0},{"name":"human","count":0},{"name":"ambiguous","count":0},{"name":"phage","count":0}]
  data.forEach(function(d) { if (d.name==bin) d.count = 1; })
// ------ Console Log Data here -------- //
  this.drawBigBinnerChart(data, data, {events: true})

  // do this horrible event b\c i don't know how to tell when binner transition is over
  $('#selected-name').html( binNode.children[0].name );
  $('#big-binner-binner').on("binnerTransitionOver", function() {
    $('#big-binner').css('visibility', 'hidden');

    // show hide panels
    $('#main-viz').css('visibility', 'visible');
    $('#sunburst-top-controls').css('visibility', 'visible');
    $('.composition').css('display', 'none');
    $('#' + bin + '-composition').css('display', 'block');
    $('#total-reads #bin').html(bin.charAt(0).toUpperCase() + bin.slice(1))
    var binCount = self.getBinRoot(bin);
    if (binCount == undefined) binCount = '';
    else binCount = binCount.count;
    $('#total-reads .iobio-txt-color').html( binCount );
  });

}

global.iobio.donutSunburst.prototype.initBreadcrumbs = function(node) {
  var self = this;
  if ($('#sunburst-breadcrumbs ul').length == 0) $('#sunburst-breadcrumbs').append('<ul></ul>');
  $('#sunburst-breadcrumbs ul').html('');
  $('#sunburst-breadcrumbs ul').append('<li> <span data-node="root" class="sunburst-breadcrumb">Pie Chart</span></li>')
  $('#sunburst-breadcrumbs ul').append('<li><div class="extra-border"/><span class="sunburst-breadcrumb">' + node.name.split(':')[1] + '</span></li>')
  $('#sunburst-breadcrumbs .sunburst-breadcrumb').on('click', function() {
    var node = this.getAttribute('data-node');
    self.selectCategory(node);
  })
}

global.iobio.donutSunburst.prototype.updateBreadcrumbs = function(node) {
  var self = this;
  var maxBreadcrumbs = 3;
  $('#sunburst-breadcrumbs ul').html('');
  if (self.mode == 'binner') return;
  node = node || getCurrRoot();
  if (node == undefined) return;
  if(node.name.split(':')[1] == 'root') node = node.children[0];

  var breadcrumbList = [];
  while(node != undefined ) {
    breadcrumbList.unshift(node);
    node = node.parent;
  }

  var start = parseInt((breadcrumbList.length-1) / maxBreadcrumbs) * maxBreadcrumbs ;
  for (var i=0; i< breadcrumbList.length; i++ ) {
    var n = breadcrumbList[i];
    var nid;
    var nname;
    var borderStyle='';

    if (n.name.split(':')[1] == 'root') {
      nid = 'root';
      nname = 'Pie Chart';
    } else {
      nid = n.id;
      nname = n.name.split(':')[1];
    }

    $('#sunburst-breadcrumbs ul').append('<li><span class="sunburst-breadcrumb" data-node="' + nid + '">' + nname + '</span></li><li><span class="sunburst-breadcrumb-navigator">...</span></li>');

    var ulH = $('#sunburst-breadcrumbs ul').height();
    var liH = $('#sunburst-breadcrumbs ul li').height();

    $('#sunburst-breadcrumbs ul li').last().remove();

    if ( ulH > liH ) {
      var elemLi = $('#sunburst-breadcrumbs ul li').last()
      elemLi.prevAll().css('display', 'none');
      elemLi.before('<li><span class="sunburst-breadcrumb-navigator" data-node="' + nid + '" data-direction="back">...</span></li>')
    }
  }

  // add border
  $('#sunburst-breadcrumbs ul li span').last().before('<div class="extra-border"/>');

  $('#sunburst-breadcrumbs .sunburst-breadcrumb').on('click', function() {
    var node = this.getAttribute('data-node');
    self.selectCategory(node);
  })

  $('#sunburst-breadcrumbs .sunburst-breadcrumb-navigator').on('click', function() {
    var direction = this.getAttribute('data-direction');
    var $elem = $(this).parent();
    if (direction == 'back') {
      $elem.prevAll().each(function(i, d) {
        d.style.display = 'inline-block';
        if (d.children[0].innerHTML == '...') return false;
      })
      $elem.nextAll().css('display', 'none');
      this.setAttribute('data-direction', 'forward');
    } else {
      $elem.nextAll().each(function(i, d) {
        d.style.display = 'inline-block';
        if (d.children[0].innerHTML == '...') return false;
      })
      $elem.prevAll().css('display', 'none');
      this.setAttribute('data-direction', 'back');
    }
  })
}

global.iobio.donutSunburst.prototype.selectCategory = function(path) {
  var self = this;
  if (typeof path == 'string' || path instanceof String) {
    var pathId = path;
    path = document.getElementById(path);
  }
  else
    var pathId = path.id;
  if (pathId == 'root') {
    if (self.pieChartCallback) self.pieChartCallback();
    self.mode = 'binner';
    $('#main-viz').css('visibility', 'hidden');
    $('#big-binner').css('visibility', 'visible');
    $('#sunburst-filters .btn-group:has(input:checked)').removeClass('disable-filter')
    $('#sunburst-filters input').css('visibility', 'visible');
    self.updateBreadcrumbs()
    self.drawBigBinnerChart(null, null, {events: false})
  } else
    $(path).d3Click();
}

global.iobio.donutSunburst.prototype.filterCount = function(val, root) {
  var self = this;
  var r = filterTree(val, function(node, val) {
    return (node.name == 'root' || node.count  >= parseInt(val))
  }, root);

  var selection = d3.select("#viz svg").datum(r);
  self.sunburstChart(selection, {pixelFilter:true});
}

global.iobio.donutSunburst.prototype.getBinRoot = function(bin) {
  var root,
      self = this;

  t.bfs(self.rootData, [], function(node, par, ctrl) {
       if (node.bin == bin) {
         root = node;
         ctrl['stop'] = true;
       }
   })
  return root;
}


function updateSliderActive() {
  if (atRoot()) {
    $('#min-read-count-slider').css('visibility', 'visible');
    $('#min-abundance').css('visibility', 'visible');
  }
  else {
    $('#min-read-count-slider').css('visibility', 'hidden');
    $('#min-abundance').css('visibility', 'hidden');
  }
}

function filterTree(val, expression, root) {
  root = root || getAbsoluteRoot();
  var displayCount = 0;

  t.dfs(root, [], function(node, par, ctrl) {
    if (node._count != undefined) {
      node.count = node._count;
      node._count = undefined;
    }
    if (!expression(node, val)) {
      t.dfs(node, [], function(n, par, ctrl) {
        if(n.count != undefined && n.count != 0) {
          n._count = n.count;
          n.count = 0;
        }
      });
      ctrl['cutoff'] = true;
    } else {
      displayCount += node.count
    }
    // updateReadsViewed(displayCount);
 })

  return root;
}

function numberFormatter (d) {
  var m = d/100000;
  var str = m.toString()[1];
  var dot = parseInt(str);
  if ((d / 1000000) >= 1)
    d = parseInt(d / 1000000) + "." +dot+ "M";
  else if ((d / 1000) >= 1)
    d = Math.round(d / 1000) + "K";
  return d;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../lib/t.js":1,"./donut.d3.js":3,"./sunburst.d3.js":4}],3:[function(require,module,exports){
var donutD3 = function() {
   var radius = 90,
       thickness = 7,
       labelr = radius + 30,
       klass = 'arc',
       total = 0;

   var svg;
   var arc = d3.svg.arc();
   var color = d3.scale.category20c();
   var options = { text:true }
   var click = function() { return; };
   var tooltip = function() { return; };

   var formatter = d3.format(",.1f");
   var commaFormatter = d3.format(",0f");

   function my(selection, opts) {
      options = $.extend(options, opts);
      labelr = radius + 30;
      arc = d3.svg.arc()
      .outerRadius(radius)
      .innerRadius(radius - thickness);

      svg = selection[0].parentNode;
      var bbox = svg.getBoundingClientRect();

      var g = selection.enter().append("g")
         .attr("class", klass)
         .attr("transform", "translate("+ bbox.width/2 + "," + bbox.height/2 + ")");

      // if ( g.data()[0] != undefined )
      //    var total = g.data()[0].data + g.data()[1].data
      // else
      //    var total = selection.data()[0].data + selection.data()[1].data

      var path = g.append("path")
         .attr("d", arc )
         .style('fill', function(d,i) { return color(d) })
         .on('click', function(d){
            click(d.data);
         })
          .each(function(d) { this._current = d; });

      total = 0;
      selection.data().forEach(function(d) { total += d.value; })
      if (tooltip) {
        path.on('mouseover', null);
        path
          .on("mouseover", function(d,i) {
               iobioSunburstTooltipDiv.transition()
                  .duration(200)
                  .style("opacity", .9);
               iobioSunburstTooltipDiv.html(tooltip(d, total))
            .style("left", (d3.event.pageX) + "px")
            .style("text-align", 'left')
            .style("top", (d3.event.pageY - 24) + "px");
            })
            .on("mouseout", function(d) {
               iobioSunburstTooltipDiv.transition()
                  .duration(500)
                  .style("opacity", 0);
            })
      }

      selection.exit().transition().remove();

      if (options.text) {
         g.append("text")
           .attr("transform", function(d) {
                var c = arc.centroid(d),
                    x = c[0],
                    y = c[1],
                    // pythagorean theorem for hypotenuse
                    h = Math.sqrt(x*x + y*y);
                return "translate(" + (x/h * labelr) +  ',' +
                   (y/h * labelr) +  ")";
            })
            .attr("dy", ".35em")
            .attr("text-anchor", function(d) {
                // are we past the center?
                return (d.endAngle + d.startAngle)/2  > Math.PI ?
                    "end" : "start";
            })
            // .attr("dy", "1.9em")
            // .style("text-anchor", "middle")
            .text(function(d,i) {
              var a = d.endAngle - d.startAngle
              if (a > 0.08)
                return d.data.name[0].toUpperCase() + d.data.name.slice(1,d.data.name.length);
            });
      }

      selection.select('text').transition()
        .duration(200)
        .attr("transform", function(d) {
            var c = arc.centroid(d),
                x = c[0],
                y = c[1],
                // pythagorean theorem for hypotenuse
                h = Math.sqrt(x*x + y*y);
            return "translate(" + (x/h * labelr) +  ',' +
               (y/h * labelr) +  ")";
        })
        .attr("text-anchor", function(d) {
            // are we past the center?
            return (d.endAngle + d.startAngle)/2 > Math.PI ?
                "end" : "start";
        })
        .text(function(d,i) {
           var a = d.endAngle - d.startAngle
           if (a <= 0.08)
             return '';
           else
             return d.data.name[0].toUpperCase() + d.data.name.slice(1,d.data.name.length);
        });

      selection.select("path").transition()
        .duration(400)
        .attrTween('d', arcTween)
        .call(endall, function() {
          if (options.events) {
            $(svg).trigger({
              type: "binnerTransitionOver",
            });
          }
        });
        // .attr("d", arc);

      function arcTween(a) {
        var i = d3.interpolate(this._current, a);
        this._current = i(0);
        return function(t) {
          return arc(i(t));
        };
      }

      function endall(transition, callback) {
        var n = 0;
        transition
            .each(function() { ++n; })
            .each("end", function() { if (!--n) callback.apply(this, arguments); });
      }

        // Computes the angle of an arc, converting from radians to degrees.
      function angle(d) {
        var a = (d.startAngle + d.endAngle) * 90 / Math.PI;
        // if (a > 270 && a < 360) return 0;
        // if (a > 270) return 0;
        // if (a > 0 && a < 180) return 0;
        // if ( (a > 0 && a < 70) || (a >110 && a < 250) || (a > 290) ) return 0;
        if ((Math.abs(a) >20 && Math.abs(a) < 160) || (a > 200 && a < 340)) return 0;
        a -= 90;
        return a > 90 ? -25 : -25;
      }

      return this;
   }


   my.radius = function(value) {
      if (!arguments.length) return radius;
      radius = value;
      return my;
   }

   my.thickness = function(value) {
      if (!arguments.length) return thickness;
      thickness = value;
      return my;
   }

   my.color = function(value) {
      if (!arguments.length) return color;
      color = value;
      return my;
   }

  my.click = function(_) {
    if (!arguments.length) return click;
    click = _;
    return my;
  }

  my.tooltip = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return my;
  }

   my.klass = function(value) {
      if (!arguments.length) return klass;
      klass = value;
      return my;
   };

   return my;
}

module.exports = donutD3;
},{}],4:[function(require,module,exports){
/*
 * Sunburst visualization
 *
 * Created by Chase Miller 2015
 */

  var sunburstD3 = function() {
    window.iobioSunburstTooltipDiv = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 1);

    var margin = {top: 25, right: 10, bottom: 25, left: 10},
        width = 200,
        height = 200,
        defaultOptions = {klass:'', 'text' : true, 'click': true, 'mouseover': true, 'idPrefix': '', transitionDuration:750, pixelFilter:true},
        color = d3.scale.category20c(),
        textColor = 'white',
        absoluteTotal = 0,
        relativeTotal = 0,
        radius = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2,
        x = d3.scale.linear().range([0, 2 * Math.PI]),
        y = d3.scale.sqrt().range([0, radius]),
        arc = d3.svg.arc()
          .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
          .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
          .innerRadius(function(d) { return Math.max(0, y(d.y)); })
          .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); }),
        normX = d3.scale.linear();

    var node;
    var partition = d3.layout.cumulativePartition().sort(null).value(function(d) { return d.count; });

    var click = function() { return; };
    var clickBefore = function() { return; };

    var me = this;

    function chart(selection, opts) {
      var self  = this;
      // merge options and defaults
      var options = extend({}, defaultOptions, opts);

      // recalc radius & y scale & arc
      var newRadius = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2;;
      if (radius != newRadius ) {
        radius = newRadius;
        y.range([0, radius]);
        arc = d3.svg.arc()
            .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
            .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
            .innerRadius(function(d) { return Math.max(0, y(d.y)); })
            .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });
      }

      // process selection
      selection.each(function(data) {
        self.data = data;
         if (!data)
          return;
        // set svg element
        var svg = d3.select(this);
        svg
          .on('mouseover', function() { d3.selectAll('.rotateControl').style("visibility","visible") })
          .on('mouseout', function() { d3.selectAll('.rotateControl').style("visibility","hidden") });

        // Select the g element, if it exists.
        var g = svg.selectAll("g").data([0]);

        // Otherwise, create the skeletal chart.
        var gEnter = g.enter().append("g")
            .attr('class', 'gEnter')
            .attr("transform", "rotate(0,"+width/2+',' + (height / 2) + ") translate(" + width / 2 + "," + (height / 2 ) + ")")
            // .attr("transform", "rotate(0,"+width/2+',' + (height / 2 + 10) + ") translate(" + width / 2 + "," + (height / 2 + 10) + ")")

        absoluteTotal = data.count;
        relativeTotal = 0;

        // generate sunburst coordinates
        var nodes = partition.nodes(data);

        // set or reset head node
        if (node == undefined || node.bin != data.bin) {
          node = data;
        }

        // set domain and ranges
        if (node) {
          x.domain([node.x, node.x + node.dx]);
          y.domain([node.y, 1]);
          y.range([node.y ? 20 : 0, radius]);
        }

        var colors = {
          'viral' : { range:['#3D0385', '#FFB7DB'], interpolate:'interpolateHcl'},
          'bacterial' : { range:['#970015', '#FFC886'], interpolate:'interpolateHsl'},
          'fungal' : { range:['#3B00AD', '#B3FFAB'], interpolate:'interpolateHcl'},
          'phage' : { range:['#03553C', '#DCFF00'], interpolate:'interpolateHcl'}
        }

        var lastChild = nodes[0].children[0].children[nodes[0].children[0].children.length-1];
        // set color space
        var bin = nodes[0].bin;
        color = d3.scale.linear()
          .domain([0.075,lastChild.x + lastChild.dx + 0.75])
          .range( colors[bin].range )
          .interpolate(d3[ colors[bin].interpolate ])
          .clamp(true);

        textColor = d3.hcl(color(0.7)).brighter(1);

        // enter
        if (options.pixelFilter)
          var path = g.selectAll(".path")
                  .data(nodes.filter(function(d){

                    if (options.filter && !options.filter(d)) return false;

                    var sa = Math.max(0, Math.min(2 * Math.PI, x(d.x)));
                    var ea = Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx)));
                    var angle = ea - sa;
                    var r = Math.max(0, y(d.y + d.dy));
                    var s = angle*r;
                    if (node && node.id == d.id || r == 0) return true;
                    return s >= 1;
                  }),
                  function(d) { return d.id; })
        else
          var path = g.selectAll(".path")
                  .data(nodes, function(d) { return d.id; })

        // exit
        path.exit().remove();

        //  update any paths that stuck around (e.g. viruses is in both phage and viral sunbursts)
        g.selectAll('.path').select('path')
          .style("fill", determineColor);

        // enter
        var gPath = path.enter().append('g')
                .attr('class', 'path');

        gPath.append("path")
              .attr("d", arc)
              .attr('id', function(d) { return options.idPrefix + d.id; })
              .style("fill", determineColor)
              .on("click", clickHandler)
              .on("mouseover", function(d,i) {
                if(i == 0 || !options.mouseover) return;
                  iobioSunburstTooltipDiv.style('display', 'block');
                  iobioSunburstTooltipDiv.transition()
                     .duration(200)
                     .style("opacity", .9);
                  var category = d.name.split(':')[0];
                  var percent = "<div>Absolute Percent:" + parseInt(d.count / absoluteTotal * 1000) / 10 + "%</div>";
                  if (relativeTotal >0) percent+= "<div>Relative Percent:" + parseInt(d.count / relativeTotal * 1000) / 10 + "%</div>";
                  if (category == 'no rank')
                    iobioSunburstTooltipDiv.html(d.name.split(':')[1] + ' - ' + d.count + ' read(s)' + percent )
                  else if (d.name.split(':')[0] == 'species')
                    iobioSunburstTooltipDiv.html('species:' + d.parent.name.split(':')[1] + '.' + d.name.split(':')[1] + ' - ' + d.count + ' read(s)' + percent )
                  else
                    iobioSunburstTooltipDiv.html(d.name + ' - ' + d.count + ' read(s)' + percent )
               .style("left", (d3.event.pageX + 4) + "px")
               .style("text-align", 'left')
               .style("top", (d3.event.pageY - 62) + "px");
               })
               .on("mouseout", function(d) {
                  iobioSunburstTooltipDiv.transition()
                     .duration(500)
                     .style("opacity", 0);
                  iobioSunburstTooltipDiv.transition()
                    .delay(500)
                    .duration(0)
                    .style('display', 'none');
               }).each(stash);

        if (options.text) {
          var text = gPath.append('text')
                .attr('x', function(d) { return 0; })
                .attr('dy', function(d) {return (y(d.y + d.dy) - y(d.y))/2;})
                .attr('dx', function(d) {
                  var sa = x(d.x);
                  var ea = x(d.x + d.dx);
                  var angle = ea - sa;
                  var r = y(d.y) + (y(d.y + d.dy) - y(d.y))/2;
                  return (angle*r)/2 ;
                })
                .style('fill', determineLetterColor)
                .style('letter-spacing', determineLetterSpacing);

          text.append("textPath")
              .attr('id', function(d) { return d.id + '-text'})
              .attr('class', 'textpath')
              .attr("xlink:href",function(d) { return location.pathname + '#' + d.id; })
              .attr('alignment-baseline', "middle")
              .attr('text-anchor', "middle")
              .style('height', '10px');

        }

        // Add rotate control
        gEnter.append('image')
          .attr('x', radius + 5)
          .attr('y', -10 )
          .attr('xlink:href', 'assets/images/rotate.png')
          .attr('width', 20 )
          .attr('height', 20)
          .attr('class', 'rotateControl')
          .call(d3.behavior.drag()
              .on("drag", function (d) {
                var exy = [d3.event.x, d3.event.y],
                  dxy = [0, 0],
                  dist = distanceBetweenPoints(exy, dxy),
                  currentAngle = parseInt(g.attr('transform').split('rotate(')[1].split(',')[0]),
                  angle = angleBetweenPoints(dxy, exy);
                  var degreeAngle = (toDegrees(angle)) + currentAngle;
                  // g.attr("transform", "rotate(" + degreeAngle + ","+width/2+',' + (height / 2 + 10) + ") translate(" + width / 2 + "," + (height / 2 + 10) + ")");
                  g.attr("transform", "rotate(" + degreeAngle + ","+width/2+',' + (height / 2 ) + ") translate(" + width / 2 + "," + (height / 2 ) + ")");
              })

          );

          gEnter.append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', radius + 5)
            .attr('y1', 0)
            .attr('class', 'rotateControl')
            .style('stroke', '#2d8fc1')

        // update
        g.selectAll('.path').select('path').transition()
          .duration(options.transitionDuration)
          .style("fill", determineColor)
          .attrTween("d", arcTweenData);

        g.selectAll('.path').select('text').transition()
            .duration(options.transitionDuration)
            .attr('x', function(d) { return 0; })
            .attr('dy', function(d) {return (y(d.y + d.dy) - y(d.y))/2;})
            .attr('dx', function(d) {
              var sa = x(d.x);
              var ea = x(d.x + d.dx);
              var angle = ea - sa;
              var r = y(d.y) + (y(d.y + d.dy) - y(d.y))/2;
              return (angle*r)/2 ;
            })
            .style('fill', determineLetterColor)
            .style('letter-spacing', determineLetterSpacing)

        g.selectAll('.path').select('.textpath').transition()
          .duration(options.transitionDuration)
          .text(function(d,i) {
            // get arc length, s
            var sa = x(d.x);
            var ea = x(d.x + d.dx);
            var angle = ea - sa;
            var r = y(d.y) + (y(d.y + d.dy) - y(d.y))/2;
            var s = angle*r-2;
            if (s < 18) return;

            var pathId = d.id.split('-text')[0];
            var name = d.name.split(':')[1] || '';
            this.textContent = name;

            var ls = determineLetterSpacing(d);

            var fontsize = 15;
            for (var k=fontsize; k >=9; k--) {
              this.style.fontSize = k;
              if (this.getComputedTextLength() + (name.length-1) * ls <= s)
                return name;
            }
            return;
        })



        d3.select(self.frameElement).style("height", height + "px");

      }); // end selection.each

      function determineLetterColor(d,i) {
        // get color of arc
        var c = determineColor(d,i);
        // conver to hsl
        var hcl = d3.hcl(c);
        var l = parseInt(hcl.l)
        if (l > 87 && c.toString() != 'white') return textColor;
        else return "white";
      }

      function determineColor(d,i) {
        if(i == 0) return 'white';
        if (node && node.parent && node.parent.id == d.id ) return color.range()[0];

        var dMid = normX(d.x)+ (normX(d.x+d.dx)-normX(d.x))/2 ;
        var depth = node ? d.depth - node.depth : d.depth
        if (depth <= 3 ) brighter = 0;
        else brighter = depth / 6;
        var c = color(dMid + d.y);
        return d3.hcl(c).brighter(brighter);

      }

      // click hanlder
      function clickHandler(clickData) {
        var data = clickData;
        while(data.parent) { data = data.parent };

        relativeTotal = node.count;
        // if (node.name == 'root:root') return; // ignore root clicks
        if (clickData.parent && clickData.parent.name.split(':')[1] == 'root') {
          clickData = clickData.parent;
        }
        node = clickData;
        if (options.click) {
          clickBefore(node);

          // if(y(d.y) <= 20) {return} // do nothing for center rings
          // selection.selectAll('text').remove();
          var endX = d3.scale.linear().range([0, 2 * Math.PI]).domain([clickData.x, clickData.x+clickData.dx])
          var endY = d3.scale.linear().range([clickData.y ? 20 : 0, radius]).domain([clickData.y, 1])

          normX = d3.scale.linear().domain([clickData.x, clickData.x + clickData.dx]).range([0.075,0.58]);
          var lastChildMax = normX(clickData.x) + normX(clickData.dx)/2 + clickData.y,
              n,
              stack = [clickData];

          // get last child max accurately
          while( (n=stack.pop()) != null ) {
            var nMax = (normX(n.x) + (normX(n.x+n.dx)-normX(n.x))/2 + n.y);
            if ( nMax > lastChildMax  ) lastChildMax = nMax;

            if (n.children) stack = stack.concat( n.children )
          }


          color.domain([normX(clickData.x) + clickData.y, lastChildMax]);

          // selection.selectAll('path')
          if (options.pixelFilter)
            var path = selection.select('g').selectAll(".path")
                  .data(partition.nodes(data).filter( function(n) {
                    // return ((endX(n.x+n.dx) - endX(n.x)) > 0.003);
                    var sa = Math.max(0, Math.min(2 * Math.PI, endX(n.x)));
                    var ea = Math.max(0, Math.min(2 * Math.PI, endX(n.x + n.dx)));
                    var angle = ea - sa;
                    var r = Math.max(0, endY(n.y + n.dy));
                    var s = angle*r;
                    return (s >= 1 || (n.y <= clickData.y));
                  }),
                    function(d) { return d.id; })
          else
            var path = selection.select('g').selectAll(".path")
                    .data(partition.nodes(data), function(d) { return d.id; })

          path.exit().remove();

          var gPath = path.enter().append('g')
                  .attr('class', 'path');

          gPath.append("path")
                .attr("d", arc)
                .attr('id', function(d) { return options.idPrefix + d.id; })
                .style("fill", determineColor)
                .on("click", clickHandler)
                .on("mouseover", function(d,i) {
                  if(i == 0 || !options.mouseover) return;
                    iobioSunburstTooltipDiv.transition()
                       .duration(200)
                       .style("opacity", .9);
                    var category = d.name.split(':')[0];
                    if (category == 'no rank')
                      iobioSunburstTooltipDiv.html(d.name.split(':')[1] + ' - ' + d.count)
                    else
                      iobioSunburstTooltipDiv.html(d.name + ' - ' + d.count)
                 .style("left", (d3.event.pageX) + "px")
                 .style("text-align", 'left')
                 .style("top", (d3.event.pageY - 24) + "px");
                 })
                 .on("mouseout", function(d) {
                    iobioSunburstTooltipDiv.transition()
                       .duration(500)
                       .style("opacity", 0);
                 }).each(stash);

            if (options.text) {
              var text = gPath.append('text')
                    .attr('x', function(d) { return 0; })
                    .attr('dy', function(d) {return (y(d.y + d.dy) - y(d.y))/2;})
                    .attr('dx', function(d) {
                      var sa = x(d.x);
                      var ea = x(d.x + d.dx);
                      var angle = ea - sa;
                      var r = y(d.y) + (y(d.y + d.dy) - y(d.y))/2;
                      return (angle*r)/2 ;
                    })
                    .style('fill', determineLetterColor)
                    .style('letter-spacing', determineLetterSpacing);

              text.append("textPath")
                  .attr('id', function(d) { return d.id + '-text'})
                  .attr('class', 'textpath')
                  .attr("xlink:href",function(d) { return location.pathname + '#' + d.id; })
                  .attr('alignment-baseline', "middle")
                  .attr('text-anchor', "middle")
                  .style('height', '10px');
            }

            selection.selectAll('.path').select('path').transition()
              .duration(750)
              .attrTween("d", arcTween(clickData))
              .style("fill", determineColor)
              .call(endall, function() {
                click(node);
                selection.selectAll('text')
                  .attr('x', function(d) { return 0; })
                  .attr('dy', function(d) {return (y(d.y + d.dy) - y(d.y))/2;})
                  .attr('dx', function(d) {
                    var sa = x(d.x);
                    var ea = x(d.x + d.dx);
                    var angle = ea - sa;
                    var r = y(d.y) + (y(d.y + d.dy) - y(d.y))/2;
                    return (angle*r)/2;
                  })
                  .style('fill', determineLetterColor)
                  .style('letter-spacing', determineLetterSpacing)
                selection.selectAll('.textpath')
                  .text(function(d,i) {
                    if (d.x < x.domain()[0] || d.x >= x.domain()[1])
                      return;

                    // get arc length, s
                    var sa = x(d.x);
                    var ea = x(d.x + d.dx);
                    var angle = ea - sa;
                    var r = y(d.y) + (y(d.y + d.dy) - y(d.y))/2;
                    var s = angle*r;
                    if (s < 18) return;
                    var ls = determineLetterSpacing(d);

                    var pathId = d.id.split('-text')[0];
                    var name = d.name.split(':')[1] || '';
                    this.textContent = name;
                    var fontsize = 15;
                    for (var k=fontsize; k >=9; k--) {
                      this.style.fontSize = k;
                      if (this.getComputedTextLength() + (name.length-1) * ls <= s)
                        return name;
                    }
                    return;
                  })
              });

        }
      }
      // When zooming: interpolate the scales.
      function arcTween(d) {
        var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
            yd = d3.interpolate(y.domain(), [d.y, 1]),
            yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
        return function(d, i) {
          return  i
              ? function(t) { return arc(d); }
              : function(t) {
                x.domain(xd(t));
                y.domain(yd(t)).range(yr(t));
                return arc(d);};
        };
      }

      // When switching data: interpolate the arcs in data space.
      function arcTweenData(a, i) {
        var currRoot = node;
        if (a.x0 == undefined || a.dx0 == undefined) {
          a.x0 = a.x + a.dx/2;
          a.dx0 = 0;
        }
        var oi = d3.interpolate({x: a.x0, dx: a.dx0}, a);
        function tween(t) {
          var b = oi(t);
          a.x0 = b.x;
          a.dx0 = b.dx;
          return arc(b);
        }
        if (i == 0) {
         // If we are on the first arc, adjust the x domain to match the root node
         // at the current zoom level. (We only need to do this once.)
          var xd = d3.interpolate(x.domain(), [currRoot.x, currRoot.x + currRoot.dx]),
              yd = d3.interpolate(y.domain(), [currRoot.y, 1]),
              yr = d3.interpolate(y.range(), [currRoot.y ? 20 : 0, radius]);
          return function(t) {
            x.domain(xd(t));
            y.domain(yd(t)).range(yr(t));
            return tween(t);
          };
        } else {
          return tween;
        }
      }


      function getNodeById(nodeId) {
        var root = this.data;
        if (nodeId == undefined) return root;
        var nodes = [root];
        var n;
        while(n = nodes.shift()) {
          if (n.id == nodeId) return n;
          if (n.children)
            nodes = nodes.concat( n.children );
        }
      }


      function determineLetterSpacing(d) {
        var r = y(d.y) + (y(d.y + d.dy) - y(d.y))/2;
        if (r > 130) return 0;
        return (130-r) / 16;
      }

      // Setup for switching data: stash the old values for transition.
      function stash(d) {
        d.x0 = d.x;
        d.dx0 = d.dx;
      }

      // end of transition solution
      function endall(transition, callback) {
        var n = 0;
        transition
            .each(function() { ++n; })
            .each("end", function() { if (!--n) callback.apply(this, arguments); });
      }

      function angleBetweenPoints(p1, p2) {
        return Math.atan2(p2[1] - p1[1], p2[0] - p1[0] );
      }

      function distanceBetweenPoints(p1, p2) {
        return Math.sqrt( Math.pow( p2[1] - p1[1], 2 ) + Math.pow( p2[0] - p1[0], 2 ) );
      }

      function toDegrees(rad) {
        return rad * (180/Math.PI);
      }

      function extend(){
          for(var i=1; i<arguments.length; i++)
              for(var key in arguments[i])
                  if(arguments[i].hasOwnProperty(key))
                      arguments[0][key] = arguments[i][key];
          return arguments[0];
      }

      // creates a tree with less nodes. replaces all the nodes past a certain depth with
      // a single gray node per level. Allows huge trees to be visualized
      function downSampleTree(root, depth) {
        var t = require('../lib/t.js')
        t.dfs(root, [], function(node, par, ctrl) {
          if (node.depth > depth) {
            var sumCount = 0;
            var childrenList = undefined;
            if(node.children) {
              node.children.forEach(function(child){
                sumCount += child.count;
                if (child.children) {
                  childrenList = childrenList || [];
                  child.children.forEach(function(c){ childrenList.push(c); })
                }
              })
              node.children = [ {
                count : sumCount,
                children : childrenList,
                id : node.children[0].id,
                depth : node.children[0].depth,
                name : 'many',
                bin : node.children[0].bin,
                parent : node,
                x : node.children[0].x,
                y : node.children[0].y,
                dx : node.children[0].dx,
                dy : node.children[0].dy,
                value : sumCount
              }]
            }
          }
       })
      }
    } // end chart function


    chart.clear = function() {
      node = undefined;
    }

    chart.margin = function(_) {
      if (!arguments.length) return margin;
      margin = _;
      return chart;
    };

    chart.width = function(_) {
      if (!arguments.length) return width;
      width = _;
      return chart;
    };

    chart.height = function(_) {
      if (!arguments.length) return height;
      height = _;
      return chart;
    };

    chart.x = function(_) {
      if (!arguments.length) return x;
      x = _;
      return chart;
    };

    chart.y = function(_) {
      if (!arguments.length) return y;
      y = _;
      return chart;
    };

    chart.color = function(_) {
      if (!arguments.length) return color;
      color = _;
      return chart;
    };

    chart.click = function(_) {
      if (!arguments.length) return click;
      click = _;
      return chart;
    }
    chart.clickBefore = function(_) {
      if (!arguments.length) return clickBefore;
      clickBefore = _;
      return chart;
    }

    return chart;
  }

   d3.layout.cumulativeHierarchy = function() {
      var sort = d3_layout_hierarchySort, children = d3_layout_hierarchyChildren, value = d3_layout_hierarchyValue;
      function hierarchy(root) {
        var stack = [ root ], nodes = [], node;
        root.depth = 0;
        while ((node = stack.pop()) != null) {
          nodes.push(node);
          if ((childs = children.call(hierarchy, node, node.depth)) && (n = childs.length)) {
            var n, childs, child;
            while (--n >= 0) {
              stack.push(child = childs[n]);
              child.parent = node;
              child.depth = node.depth + 1;
            }
            if (value) node.value = +value.call(hierarchy, node, node.depth);
            node.children = childs;
          } else {
            if (value) node.value = +value.call(hierarchy, node, node.depth) || 0;
            delete node.children;
          }
        }
        d3_layout_hierarchyVisitAfter(root, function(node) {
          var childs, parent;
          if (sort && (childs = node.children)) childs.sort(sort);
          // if (value && (parent = node.parent))  parent.value += node.value;
        });
        return nodes;
      }
      hierarchy.sort = function(x) {
        if (!arguments.length) return sort;
        sort = x;
        return hierarchy;
      };
      hierarchy.children = function(x) {
        if (!arguments.length) return children;
        children = x;
        return hierarchy;
      };
      hierarchy.value = function(x) {
        if (!arguments.length) return value;
        value = x;
        return hierarchy;
      };
      hierarchy.revalue = function(root) {
        if (value) {
          d3_layout_hierarchyVisitBefore(root, function(node) {
            if (node.children) node.value = 0;
          });
          d3_layout_hierarchyVisitAfter(root, function(node) {
            var parent;
            if (!node.children) node.value = +value.call(hierarchy, node, node.depth) || 0;
            if (parent = node.parent) parent.value += node.value;
          });
        }
        return root;
      };
      return hierarchy;
    };
    function d3_layout_hierarchyRebind(object, hierarchy) {
      d3.rebind(object, hierarchy, "sort", "children", "value");
      object.nodes = object;
      object.links = d3_layout_hierarchyLinks;
      return object;
    }
    function d3_layout_hierarchyVisitBefore(node, callback) {
      var nodes = [ node ];
      while ((node = nodes.pop()) != null) {
        callback(node);
        if ((children = node.children) && (n = children.length)) {
          var n, children;
          while (--n >= 0) nodes.push(children[n]);
        }
      }
    }
    function d3_layout_hierarchyVisitAfter(node, callback) {
      var nodes = [ node ], nodes2 = [];
      while ((node = nodes.pop()) != null) {
        nodes2.push(node);
        if ((children = node.children) && (n = children.length)) {
          var i = -1, n, children;
          while (++i < n) nodes.push(children[i]);
        }
      }
      while ((node = nodes2.pop()) != null) {
        callback(node);
      }
    }
    function d3_layout_hierarchyChildren(d) {
      return d.children;
    }
    function d3_layout_hierarchyValue(d) {
      return d.value;
    }
    function d3_layout_hierarchySort(a, b) {
      return b.value - a.value;
    }
    function d3_layout_hierarchyLinks(nodes) {
      return d3.merge(nodes.map(function(parent) {
        return (parent.children || []).map(function(child) {
          return {
            source: parent,
            target: child
          };
        });
      }));
    }


  /*
   * Cumulative partition add on for d3.js
   * same as paritiion function but sums all the children nodes as part
   * of the total value for each arc
   * Created by Chase Miller 2015
   */
  d3.layout.cumulativePartition = function() {
    var hierarchy = d3.layout.cumulativeHierarchy(), size = [ 1, 1 ];
    function position(node, x, dx, dy) {
      var children = node.children;
      node.x = x;
      node.y = node.depth * dy;
      node.dx = dx;
      node.dy = dy;
      if (children && (n = children.length)) {
        var i = -1, n, c, d;
        dx = node.value ? dx / node.value : 0;
        while (++i < n) {
          position(c = children[i], x, d = c.value * dx, dy);
          x += d;
        }
      }
    }
    function depth(node) {
      var children = node.children, d = 0;
      if (children && (n = children.length)) {
        var i = -1, n;
        while (++i < n) d = Math.max(d, depth(children[i]));
      }
      return 1 + d;
    }
    function partition(d, i) {
      var nodes = hierarchy.call(this, d, i);
      position(nodes[0], 0, size[0], size[1] / depth(nodes[0]));
      return nodes;
    }
    partition.size = function(x) {
      if (!arguments.length) return size;
      size = x;
      return partition;
    };
    return d3_layout_hierarchyRebind(partition, hierarchy);
  };

  module.exports = sunburstD3;
},{"../lib/t.js":1}]},{},[2])


//# sourceMappingURL=donut.sunburst.js.map
