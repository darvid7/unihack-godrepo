import math
import numpy as np
import os
import sys


# Take 2 recordings at the start.
# Take 2 recordings at the end.



# D/sync: accelerometer start x: 0.6514453, y: 2.1555176, z: 9.848321
# D/sync: accelerometer end x: 6.672525, y: 3.774551, z: -6.2749515

origin_point = (0.6514453, 2.1555176, 9.848321)
end_point = (6.672525, 3.774551, -6.2749515)

# 119.52070 degrees

dot_product = np.dot(origin_point, end_point)

# np.dot(origin_point, end_point) / 

origin_mag = np.linalg.norm(origin_point)
end_mag = np.linalg.norm(end_point)

angle = dot_product / np.dot(origin_mag, end_mag)

print("orign mag: %s, end mag: %s" % (origin_mag, end_mag))
print("angle pre cos: %s" % angle)

# This works yo!
# https://www.symbolab.com/solver/vector-angle-calculator/angle%20%5Cbegin%7Bpmatrix%7D2%26-4%26-1%5Cend%7Bpmatrix%7D%2C%20%5Cbegin%7Bpmatrix%7D0%265%262%5Cend%7Bpmatrix%7D?or=ex

actual_angle = math.degrees(math.acos(angle))
print("actual angle in degrees: %s" % actual_angle) 
print(dot_product)