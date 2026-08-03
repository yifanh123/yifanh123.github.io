---
title: How running a home server affected my workflow.
date: 2026-07-31
summary: Setting up a home server using raspberry pi.
metaDescription: How to set up home server using raspberry pi.
tags: [Home Server, Raspberry Pi]
---

# Raspberry Pi 4 Home Server

I started running a home server a few months ago and it has made my life a whole lot better. I am going to go over some of the quality of life improvements how to set this up yourself. All of the software I will mention is completely free and opensource, the only things that are a bit pricy is the raspberry pi itself and maybe a storage device.

## QOL Improvements

I will talk about these in the order I discovered them. This is not the best order to start but it's inconsequential, all the projects are separate and don't affect each other.

### PiHole + Unbound (Ad block + DNS)
Dislike random pop-ups when browsing the internet? By routing my own DNS server using pi-hole, I got rid of a majority of advertisements and pop-ups that appear.
The DNS server is like signs on the bridge that connects your home wi-fi to the internet. How the ad block works, is by sending ad traffic to dead ends, making them fall into empty pits instead of getting in to your home. The DNS server will route the ad packets away so they never reach the wi-fi that you are actively using. This helps performance as well, as ads are blocked before they even load in.
Unfortunately, this method doesn't block important ads, like on Youtube. Youtube ads are built in the video player so if the DNS tries to block this, the video would also not load. I still haven't found a great way around this, and the ad block extension that I used to use stopped working, so I guess Youtube won this fight.

### Wireguard (VPN)
This was the main reason I wanted to set up the home server. I wanted a way to remote desktop into my PC from classes and this was the easiest way to approach it. Windows Pro has a built in remote desktop system that requires your access computer to be on the same Wi-fi and a VPN just solves that issue. A plus with the vpn is it automatically runs the ad block so I do not need to set up the adblock on my laptop.

The VPN works very well, it even works around China's firewall. Very much recommend, my brother could play his video games because of this :thumbsup:.

### Nextcloud (Cloud Storage)
Cloud storage might be the greatest thing humanity has ever invented. It was always annoying needed to move files from my macbook to my PC, needing to physically move a hard drive from one computer to another. Before this, I would use Dropbox, which does work, nothing against Dropbox, but I would prefer not to spend that money.

All my files moved onto an external hard drive (these are pretty expensive these days) and now I can just transfer files from my laptop to this and have it here.

### Vaultwarden (Password Manager)
Since I already have all of this set up, why keep using google's password manager? Yeah I don't really know why I did this. Vaultwarden is just like any password manager app. All it does is keep your passwords together so you don't lose it. It uses Bitwarden's ecosystem so you get most of the benefits from Bitwarden. I am a very forgetful person and really need a good password manager to remember my passwords for me. This is just easier way to get all my passwords, and on a plus side, I know where all of it is stored.

## How to set all of this up.
Raspberry pi required (I set this up on a pi4), external hard drive highly prefered.
This is 100% able to run on anything that runs docker, but this is just how I set this up and how I know how to do it.

## Raspberry Pi setup

### Downloading OS image
This one is pretty simple. When you first get a Raspberry Pi, depending on where you got it from, there might be an image already on it. But because we are using this as a home server and not a computer, we don't really need a lot of the features a full image has like the GUI. Because of this, we are going to manually download a new image onto the raspberry pi.

First, we need to get raspberry pi imager. [https://www.raspberrypi.com/software/](https://www.raspberrypi.com/software/) This allows us to install our prefered version. Of course, any working version works here but I picked the lite version for performance, cutting out all unnecessary processing power.

Now we are to get the micro SD card from the pi and connect it to our computer. The imager asks for the device, the OS, and the storage. The device is just your version of raspberry pi. The OS I picked is "Raspberry Pi OS Lite (64-bit)" which is under the other section of the imager. And storage, make sure to select the correct storage device. This will ERASE all the files on the device before writing and it is PERMANENT. Double check to make sure you selected the micro SD card that the raspberry pi was using.

Now it will pop up some setting. It requires a host name, which I just called "raspberrypi". Enable SSH, this allows us to use any computer on the network to access the pi, so you don't need to connect periferals to the pi. Set a username and password for the SSH, usually username gets defaulted to pi but make sure to set a good password.
If you have ethernet, skip this, but if you are connecting the pi to the interet via Wi-fi, make sure to put in the network name, password, and country code.
Other settings are optional but you can scroll through them to set time zone, keyboard layout, etc.

### Connecting to the Pi

Now, the Raspberry Pi image is all installed. Let's plug in the pi and boot it up.

First, the pi will need to connect to the internet. Plug in the ethernet cable, or if you set up Wi-fi, it would auto connect. To find the pi's IP address there are a few methods.
Check your network from your router. The router provider should give an app or website that gives you access to DHCP of your Wi-fi network. This is the service that assigns IP addresses to devices that connect to the router. Reading this, you can get the IP address of your pi.
Something similar to that is to get a network scanner app like fing on your phone, that will scall the entire network and tell you what IP's are assigned to what, though there is a chance that the the name might not appear.
The most reliable way to find this is just to connect a keyboard and monitor to the pi and look it up in the terminal and run:
```ip a```
To get the correct IP address, you are looking for either eth or wlan, make sure not to grab the 127.0.0.1. This is the local IP and does not connect anyway. Big change it starts with 192.168.x.x, because those two numbers is the header of all home networks.
Once you know the IP address, we can connect to the pi with ssh, so we don't need to have the keyboard and monitor connected to the pi to work on it. Open command prompt or terminal and run:
```
ssh pi@192.168.x.x
```
It will prompt you for username and password, this is what you set up in the Raspberry Pi Imager.

### Update and Static IP

The first thing to do is to update the pi, run:
```
sudo apt update && sudo apt upgrade -y
```
It might prompt you to put in the password.

We want the IP address of the pi to never change, due to system requirements from most of the software we are using. There are two ways to do this.

Option 1, set a DHCP reservation on the router app or website you used previously.

Option 2, set this up directly on the raspberry pi. To make sure the router doesn't accidently reassign this IP to another device, check the IP range of the router with Fing or the router app and select a IP that is not in the IP range provided (the entire range is 192.168.x.1-255 and most routers do not assign 255 devices). Then, by running
```
sudo nano -w /etc/dhcpcd.conf
```
you can edit the config file and uncomment out the static IP configuration line. Put the static IP address you want for the pi, and add the gateway (this will be the router's IP address and is usually the IP address ending with .1) and DNS servers (point this to the router and use 1.1.1.1).
```
# Example static IP configuration:
interface eth0
static ip_address=192.168.x.x/24
# static ip6_address=fd51:42f8:caae:d92e::ff/64
static routers=192.168.x.1
static domain_name_servers=192.168.x.1 1.1.1.1
```
I left the ip6 out because it is not necessary. Hit ctrl+x to exit and save. To make the pi use these network settings, reboot it by running
```
sudo reboot
```

## Installing pi-hole

SSH back into to the pi, remember to use the new static IP that was just assigned, then run:
```
curl -sSL https://install.pi-hole.net | bash
```
Once it gets installed it will start up a setup wizard, follow all of the steps on the wizard to finish the install. Past the first couple pages, the wizard will give a warning about setting up a static IP address but you can hit continue because we have already set this up. Double check that the static IP that the pi reads is correct and set it to the custom static IP. It will give three pages on this, setting the static IP is very important, so make sure to take your time to set it up correctly.

It will ask to use an upstream DNS provider. Since Unbound will be installed later, the choice here is temporary so just pick anyone that seems cool. I went with cloudflare for this one.

Note: Unbound is quite optional and upstream DNS providers can just work for the most part. Here is some documentation from offical pi-hole that covers which DNS providers are good for phishing, malware, etc.

The next tab will ask for default block list, which will be the main list the ad block uses to determine what gets blocked. Click yes for now, but there will be a method to add more block lists later.

Continue through installing an Admin Web interface, this is what we will be using later to modify settings for the pi-hole. Next, they ask about query logging. This option is for the dashboard to track what gets looked up on the DNS server (this can be used for another IOT project to track the houses traffic.) But if you are extra security minded, turning this off is not an issue. Next, it asks for the level of privacy for this data tracking, this just depends on the amount of information you want to be accessed through the dashboard.

We are now set up. The pi-hole will start running its scripts and soon give an installation complete screen with instructions on how to navigate to the main dashboard, as well as the temporary password (which you don't need to write down as we will change it almost immediately).

### Using the pi dashboard.

First run
```
pihole -a -p
```
to change the password to what you want it to be and now we can log in to the pi dashboard. Navigate to a web browser and go to the local IP address of the pi. http://192.168.x.x/admin. Enter the password that was previously set. Explore around, there will be a lot of setting that can be edited.
