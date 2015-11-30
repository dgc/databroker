# Temperatures image

set terminal png size 1000,600 enhanced large
set output 'output.png'


set xdata time
set xrange [ 0.0000 : 1440.000 ] noreverse nowriteback
set yrange [ 18.0000 : 25.000 ] noreverse nowriteback
set xlabel "Time of day"
set ylabel "Temperature (Celcius)"
# unset ytics
# unset xtics
# unset border

set style line 101 lc rgb '#808080' lt 1 lw 1
set tics nomirror out scale 0.75
set border 3 front ls 101

set style line 102 lc rgb '#a0a0a0#' lt 0 lw 1
set grid back ls 102
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
