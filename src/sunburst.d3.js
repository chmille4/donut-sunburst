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