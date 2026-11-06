#!/usr/bin/env node
// A committed launcher, because package managers link a bin at install time. In a fresh
// checkout, install comes before build, so pointing at dist/ would leave no croff command.
import "../dist/bin.js";
