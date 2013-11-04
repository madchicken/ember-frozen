"use strict";

module.exports = function(grunt) {

    require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks);

    grunt.initConfig({

        // Define Directory
        dirs: {
            js:     "src/js",
            build:  "dist"
        },

        // Metadata
        pkg: grunt.file.readJSON("package.json"),
        banner:
        "\n" +
        "/*\n" +
         " * -------------------------------------------------------\n" +
         " * Project: <%= pkg.title %>\n" +
         " * Version: <%= pkg.version %>\n" +
         " *\n" +
         " * Author:  <%= pkg.author.name %>\n" +
         " * Site:     <%= pkg.author.url %>\n" +
         " * Contact: <%= pkg.author.email %>\n" +
         " *\n" +
         " *\n" +
         " * Copyright (c) <%= grunt.template.today(\"yyyy\") %> <%= pkg.author.name %>\n" +
         " * -------------------------------------------------------\n" +
         " */\n" +
         "\n",

        // Minify and Concat archives
        concat: {
            dist: {
                separator: '\n\n',
                src: [
                    "<%= dirs.js %>/frozen.js",
                    "<%= dirs.js %>/converters.js",
                    "<%= dirs.js %>/relationships.js",
                    "<%= dirs.js %>/model.js",
                    "<%= dirs.js %>/validators.js",
                    "<%= dirs.js %>/adapter.js",
                    "<%= dirs.js %>/urlMappingAdapter.js",
                    "<%= dirs.js %>/restAdapter.js"
                ],
                dest: "<%= dirs.build %>/ember-frozen.js",
            }
        },
        uglify: {
            options: {
                mangle: false,
                banner: "<%= banner %>"
            },
            dist: {
              files: {
                  "<%= dirs.build %>/ember-frozen.min.js": "<%= dirs.build %>/ember-frozen.js"
              }
            }
        },

        // Notifications
        notify: {
          js: {
            options: {
              title: "Javascript - <%= pkg.title %>",
              message: "Minified and validated with success!"
            }
          }
        },

        //Specifications
        jasmine: {
            src: '<%= dirs.build %>/ember-frozen.js',
            options: {
                specs: 'spec/*.spec.js',
                vendor: ['lib/ember/jquery-1.9.1.js', 'lib/ember/handlebars-1.0.0.js', 'lib/ember/ember-1.0.0.js']
            }
        }
    });


    // Register Taks
    // --------------------------

    // Observe changes, concatenate, minify and validate files
    grunt.registerTask( "default", [ "concat", "uglify", "notify:js" ]);
    grunt.registerTask( "test", [ "concat", "uglify", "jasmine", "notify:js" ]);
    grunt.registerTask( "travis", [ "concat", "uglify", "jasmine" ]);

};