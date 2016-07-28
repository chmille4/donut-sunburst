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