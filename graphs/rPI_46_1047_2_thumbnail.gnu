# Temperatures thumbnail

set terminal png size 250,150 enhanced font "Helvetica,20"
set output 'output.png'
set datafile separator ","

set multiplot

############################## Temperatures ##############################

set size 1.0, 0.75
set origin 0.0, 0.25

set xdata time
set xrange [ 0.0000 : 1440.000 ] noreverse nowriteback
set yrange [ 10.0000 : 35.000 ] noreverse nowriteback

unset ytics
unset xtics
unset border

set lmargin  0
set rmargin  0
set tmargin  0
set bmargin  0

x = 0.0

plot 'data.csv' using 0:2  notitle with lines linecolor rgb "#5B9BD5", \
     'data.csv' using 0:3  notitle with lines linecolor rgb "#ED7D31", \
     'data.csv' using 0:4  notitle with lines linecolor rgb "#A5A5A5", \
     'data.csv' using 0:5  notitle with lines linecolor rgb "#FFC000"

############################## Flow rates ##############################

set size 1.0, 0.25
set origin 0.0, 0.0

set xdata time
set xrange [ 0.0000 : 1440.000 ] noreverse nowriteback
set yrange [ 0.0000 : 5.000 ] noreverse nowriteback

unset ytics
unset xtics
unset border

set lmargin  0
set rmargin  0
set tmargin  0
set bmargin  0

x = 0.0

plot 'data.csv' using 0:6  notitle with lines linecolor rgb "#5B9BD5", \
     'data.csv' using 0:7  notitle with lines linecolor rgb "#ED7D31"

unset multiplot