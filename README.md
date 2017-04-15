# Data Broker

## Introduction

Data Broker is a system that is used to collect and store data from
devices over a message bus. It uses [MQTT](http://mqtt.org/) however it could
support other message buses in the future.

This software was developed to support measurement of laboratory equipment
at the [University of Southampton](http://www.southampton.ac.uk) in Chemistry,
Physics and as part of a site-wide carbon monitoring programme. The development
was supported by the [IT as a Utility Network](http://www.itutility.ac.uk/).

## Get Started

1. Install prerequisites (CentOS):

        sudo yum install nodejs mosquitto
        
1. Clone the repository:

        git clone https://github.com/dgc/databroker.git

1. Install the dependencies:

        npm install
        
1. Adjust the configuration file by editing `conf/configuration.json`.

1. Run the server:

        bin/www

1. Point your web browser at [http://127.0.0.1/](http://127.0.0.1/)