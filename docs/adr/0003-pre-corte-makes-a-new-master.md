# The Pré-corte produces a new Master; the Original is never touched

The upstream rule `locked-final-cut` forbids cutting the recorded video, which leaves creators who deliver raw footage with silences unserved. We add an optional Pré-corte stage that writes a *new* file from kept transcript segments; once the Criadora approves it, that file becomes the Master and `locked-final-cut` applies to it from then on. The Original stays in `video/original/` untouched, so the locked-master guarantee survives while the most tiring manual task (trimming silences) moves into the studio.
