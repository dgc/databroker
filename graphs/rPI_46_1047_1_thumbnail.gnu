# Temperatures thumbnail

set terminal png size 250,150 enhanced font "Helvetica,20"
set output 'output.png'

set xdata time
set xrange [ 0.0000 : 1440.000 ] noreverse nowriteback
set yrange [ 18.0000 : 25.000 ] noreverse nowriteback

unset ytics
unset xtics
unset border

set lmargin  0
set rmargin  0
set tmargin  0
set bmargin  0

x = 0.0

plot 'data.tsv' using 0:2  notitle with lines linecolor rgb "#5B9BD5", \
     'data.tsv' using 0:3  notitle with lines linecolor rgb "#ED7D31", \
     'data.tsv' using 0:4  notitle with lines linecolor rgb "#A5A5A5", \
     'data.tsv' using 0:5  notitle with lines linecolor rgb "#FFC000", \
     'data.tsv' using 0:6  notitle with lines linecolor rgb "#4472C4", \
     'data.tsv' using 0:7  notitle with lines linecolor rgb "#70AD47", \
     'data.tsv' using 0:8  notitle with lines linecolor rgb "#255E91", \
     'data.tsv' using 0:9  notitle with lines linecolor rgb "#9E480E", \
     'data.tsv' using 0:10 notitle with lines linecolor rgb "#636363", \
     'data.tsv' using 0:11 notitle with lines linecolor rgb "#997300"
