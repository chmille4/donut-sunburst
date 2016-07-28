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
