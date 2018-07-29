/*
* main.js
*  Dynamically loads JSON snippets from json-examples directory on page load
* Author: Tyler Goodwin
*/
$(document).ready(function(){
  $("[data-display='code-snippet']").each(function(){
    var el = $(this);
    var snippet = el.attr("data-snippet");
    $.getJSON("/json-examples/"+snippet+".json", function(data){
      el.html(JSON.stringify(data, null, 2));
    });
  });

  $("[data-display='text-snippet']").each(function(){
    var el = $(this);
    var snippet = el.attr("data-snippet");
    $.get("/json-examples/"+snippet+".txt", function(data){
      el.html(data);
    });
  });
});
