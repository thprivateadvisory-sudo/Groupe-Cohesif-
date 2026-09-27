#!/bin/bash
# prev.sh module t1 t2 t3 t4
cd /tmp/vid/web
node render.js preview $1 960 540 $2,$3,$4,$5 2>&1 | grep -v "^t \|PCFSoft\|404"
cd prev; f() { printf "%s_%.2f.jpg" $1 $2; }
ffmpeg -loglevel error -y -i $(f $1 $2) -i $(f $1 $3) -i $(f $1 $4) -i $(f $1 $5) -filter_complex "[0][1][2][3]xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0" m_$1.jpg
