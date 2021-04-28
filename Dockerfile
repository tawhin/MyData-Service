FROM node:current-slim
LABEL MAINTAINER=trevwhin@gmail.com

#Copy the source code in to the /src container
COPY . /service

RUN cd /service; npm install

# Run this command to start the app when the container starts
CMD cd /service && npm start