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
                    "<%= dirs.js %>/model.js",
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
        }
    });


    // Register Taks
    // --------------------------

    // Observe changes, concatenate, minify and validate files
    grunt.registerTask( "default", [ "concat", "uglify", "notify:js" ]);

};