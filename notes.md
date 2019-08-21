
## Information:

model - The concept of one object

Vertices - a number of ordered coordinates that constitute the spatial representation of a model

Instance - How one instance of a model is placed in the scene (model matrix)

Texture - additional information such as colors/normals/offsets

## Hierarchy

Texture
  |
 1:1
  |
Model - 1:m - Instance
  |
 1:n
  |
Vertices

## Problem

In the vertexshader each vertex needs to know its instances matrix as well as its texture coordinates.
