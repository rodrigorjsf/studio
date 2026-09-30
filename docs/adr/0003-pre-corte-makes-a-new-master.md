# The Pré-corte produces a new Master; the Original is never touched

The upstream rule `locked-final-cut` forbids cutting the recorded video, which leaves creators who deliver raw footage with silences unserved. We add an optional Pré-corte stage that writes a *new* file from kept transcript segments; once the Criadora approves it, that file becomes the Master and `locked-final-cut` applies to it from then on. The Original stays in the Vídeo's `original/` folder untouched, so the locked-master guarantee survives while the most tiring manual task (trimming silences) moves into the studio.

Because every Palavra-gatilho is timed on the Master, the Pré-corte also moves the word-timed transcript onto the new Master's clock (the Original's transcript is kept beside it) and records the segment map. It runs only before the Plano, since the Plano is timed on the Master.
