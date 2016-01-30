# Temperatures image

set terminal png size 1000,600 enhanced large
set output 'output.png'
set datafile separator ","

set multiplot

############################## Temperatures ##############################

set size 1.0, 0.75
set origin 0.0, 0.25

set xdata time
set xrange [ 0.0000 : 1440.000 ] noreverse nowriteback
set yrange [ 10.0000 : 30.000 ] noreverse nowriteback
set xlabel "Time of day"
set ylabel "Temperature (Celcius)"

set lmargin at screen 0.06

# unset ytics
# unset xtics
# unset border

set key right top outside

set style line 101 lc rgb '#808080' lt 1 lw 1
set tics nomirror out scale 0.75
set border 3 front ls 101

set style line 102 lc rgb '#a0a0a0' lt 0 lw 1
set grid back ls 102
x = 0.0

plot 'data.csv' using 0:2  title "Evo Water"      with lines linecolor rgb "#5B9BD5", \
     'data.csv' using 0:3  title "Spitfire Water" with lines linecolor rgb "#ED7D31", \
     'data.csv' using 0:4  title "Chiller Room"   with lines linecolor rgb "#A5A5A5", \
     'data.csv' using 0:5  title "Gas Cupboard"   with lines linecolor rgb "#FFC000"

############################## Flow rates ##############################

set size 1.0, 0.25
set origin 0.0, 0.0

set xdata time
set xrange [ 0.0000 : 1440.000 ] noreverse nowriteback
set yrange [ 0.0000 : 5.000 ] noreverse nowriteback
set xlabel "Time of day"
set ylabel "Flow (L/min)"
# unset ytics
# unset xtics
# unset border

set key right top outside

set style line 101 lc rgb '#808080' lt 1 lw 1
set tics nomirror out scale 0.75
set border 3 front ls 101

set style line 102 lc rgb '#a0a0a0' lt 0 lw 1
set grid back ls 102
x = 0.0

plot 'data.csv' using 0:6  title "Evo Water"      with lines linecolor rgb "#5B9BD5", \
     'data.csv' using 0:7  title "Spitfire Water" with lines linecolor rgb "#ED7D31"

unset multiplot
