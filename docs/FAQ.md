# FAQ

## What is the main advantage of kview compared to kubectl, Helm, OpenLens, Lens, or k9s?

The main advantage of `kview` is that it is not just a raw Kubernetes viewer or command wrapper. It combines cluster navigation, Helm awareness, dataplane-backed cached snapshots, namespace enrichment, dashboard heuristics, search, and direct inspection workflows in one focused operator UI.

In practice, that means:

- compared to `kubectl`, it reduces the amount of manual querying, context switching, and mental stitching needed to understand what is happening
- compared to `helm`, it gives broader cluster and namespace visibility instead of only release-oriented operations
- compared to `OpenLens` / `Lens`, it is more opinionated about fast operational diagnosis, dataplane summaries, and problem surfacing
- compared to `k9s`, it aims to provide richer derived context, more guided inspection, and stronger cross-resource summaries instead of mainly terminal-style navigation

So the short answer is: `kview` helps operators move faster from "something looks wrong" to "this is the exact resource and likely problem," with less manual digging across separate tools.
