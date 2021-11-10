# Verizon <> MongoDB Immersion Day Demo

The VZ Immersion Day Demo showcases an application built in collaboration with
Verizon and MongoDB. It is an app that allows you to detect olympic athletes
that competed in the 2020 Tokyo olympics by just uploading their picture. The
app was built to showcase AWS Wavelength, Verizon 5G, and MongoDB capabilities
at the edge.

To get started run `npm install`. While the dependencies are installed, rename
the `.env.example` file to `.env` and replace the stubbed out variables with
your data. You will need your MongoDB Connection String, a Database Name, and a
Collection name to store the data. Once you have populated these fields and npm
install has installed all of it's dependencies, run `node index.js` to start
your application.

## Training the Data Model

To train the data model, open up the `athletes.json` file. In this file you will
see a list of JSON documents containing athlete information. Feel free to add
additional athletes as you see fit.

To train the data model, run `node addFaceDescriptors.js`. This script will add
FaceAPI face descriptors to all the athletes and will generate a new file called
`athletes-withDescriptors.json`. If you open that file, you will see that each
athlete now has an additional `descriptors` array containing their face
information.

## Saving the Athlete Information to MongoDB

To upload the athlete data and face descriptions, execute `node uploadToMDB.js`.
This will add all of the athletes and their accompanying face data into your
MongoDB database, whether it's hosted on MongoDB Atlas or elsewhere.

Need a MongoDB Database?
[Try MongoDB Atlas for Free](https://www.mongodb.com/atlas)!

## Testing the Application

Once you have your athlete information loaded into a MongoDB database, you're
ready to test the application. To start up the app, run `node index.js`.

Navigate to `localhost:3000` in your browser. You will be presented with a UI to
add an athlete. Upload a picture and watch the magic happen.

## Note: If you want to use TensforFlow GPU

Leveraging a compatible GPU will make the face detection work much faster. To
enable Tensorflow GPU, simply uncomment line 9 in `index.js`. Additionally, in
your `node_modules` folder, you will need to navigate to the `face-api.js`
directory and delete its `node_modules` folder. Once you do this, restart the
app and you should be able to leverage your GPU for face detection.

---

## Instructions for Deploying the above application on Verizon 5G Edge with AWS Wavelength

The following tutorial guides you through deploying your first computer vision
application on Verizon 5G Edge with AWS Wavelength. In this hands-on lab, we
will walk through 8 key steps:

- **Step 1**: Create the VPC
- **Step 2**: Create the Security Groups
- **Step 3**: Create Subnets and Route tables
- **Step 4**: Create Elastic IP and Network Interface
- **Step 5**: Deploy Inference Server on EC2

## Step 1: Provision your VPC

The first step in this tutorial will be to deploy the VPC, Internet gateway, and
Carrier Gateway.

- We will need the Carrier Gateway to provide connectivity for the Wavelength
  Zone instances
- We will need the Internet Gateway to provision the bastion host to configure
  the Wavelength Zone instance.

In order to get started, you will set some environment variables. Please select
the AWS Region closest to you.

```
# For deployments in us-east-1 region
export REGION="us-east-1"
export WL_ZONE="us-east-1-wl1-bos-wlz-1"
export NBG="us-east-1-wl1-bos-wlz-1"
export INFERENCE_IMAGE_ID="ami-036acd1d32fc5c7ba"
export BASTION_IMAGE_ID="ami-02e136e904f3da870"
export KEY_NAME=<your key name>

# For deployments in us-west-2 region
export REGION="us-west-2"
export WL_ZONE="us-west-2-wl1-sfo-wlz-1"
export NBG="us-west-2-wl1-sfo-wlz-1"
export INFERENCE_IMAGE_ID="ami-07ae87be85623a7b2"
export API_IMAGE_ID="ami-0a634ae95e11c6f91"
export BASTION_IMAGE_ID="ami-013a129d325529d4d"
export KEY_NAME=<your key name>
```

Looking to get creative? Feel free to switch the `WL_ZONE` and `NBG` parameters
to any of the following Wavelength Zones, to find a city closest to you! **East
(us-east-1)**

- Boston: us-east-1-wl1-bos-wlz-1
- NYC: us-east-1-wl1-nyc-wlz-1
- Washington, DC: us-east-1-wl1-was-wlz-1
- Atlanta: us-east-1-wl1-atl-wlz-1
- Miami: us-east-1-wl1-mia-wlz-1
- Dallas: us-east-1-wl1-dfw-wlz-1
- Houston: us-east-1-wl1-iah-wlz-1
- Chicago: us-east-1-wl1-chi-wlz-1

**West (us-west-2)**

- San Francisco: us-west-2-wl1-sfo-wlz-1
- Las Vegas: us-west-2-wl1-las-wlz-1
- Denver: us-west-2-wl1-den-wlz-1
- Seattle: us-west-2-wl1-sea-wlz-1
- Phoenix: us-west-2-wl1-phx-wlz-1

Also, note that `KEY_NAME` requires you to pass an existing key name, and if you
don't have an existing key, run the following command. Just be sure to change
`MyKeyPair` to a unique key name.

```
 aws ec2 create-key-pair --key-name MyKeyPair --query 'KeyMaterial' --output text > MyKeyPair.pem
 export KEY_NAME=<your key name>
```

Next, create the VPC using a 10.0.0.0/16 CIDR range.

```
export VPC_ID=$(aws ec2 create-vpc  \
--region $REGION  \
--output text  \
--cidr-block 10.0.0.0/16  \
--query 'Vpc.VpcId')  \
&& echo '\nVPC_ID='$VPC_ID
```

Now, let's attach an internet gateway to the VPC for our parent region subnet.
Note that the creation and attachment of the Carrier Gateway occurs through a
single CLI command, unlike the Internet Gateway.

```
export IGW_ID=$(aws ec2 create-internet-gateway  \
--region $REGION  \
--output text  \
--query 'InternetGateway.InternetGatewayId')  \
&& echo ' \nIGW_ID='$IGW_ID

aws ec2 attach-internet-gateway  \
--region $REGION  \
--vpc-id $VPC_ID  \
--internet-gateway-id $IGW_ID

export CAGW_ID=$(aws ec2 create-carrier-gateway  \
--region $REGION  \
--output text  \
--vpc-id $VPC_ID  \
--query 'CarrierGateway.CarrierGatewayId')  \
&& echo '\nCAGW_ID='$CAGW_ID
```

You're off to a great start!

## Step 2: Create the Security Groups

To ensure that the appropriate ports are open to the internet and carrier
network, let's create our bastion host security group. Here, we'll only need to
open up TCP port 22, from the IP address of your device, for SSH access.

```
export BASTION_SG_ID=$(aws ec2 create-security-group \
--region $REGION \
--output text \
--group-name bastion-sg \
--description "Security group for bastion host" \
--vpc-id $VPC_ID \
--query 'GroupId') \
&& echo '\nBASTION_SG_ID='$BASTION_SG_ID

aws ec2 authorize-security-group-ingress \
--region $REGION \
--group-id $BASTION_SG_ID \
--protocol tcp \
--port 22 \
--cidr $(curl https://checkip.amazonaws.com)/32
```

Next, create a new security group for the inference server. Since the Node.js
application will run over port 3000, we only need to open TCP port 3000 to the
internet (0.0.0.0/0).

```
INFERENCE_SG_ID=$(aws ec2 create-security-group \
--region $REGION \
--output text \
--group-name inference-sg \
--description "Security group for inference host" \
--vpc-id $VPC_ID \
--query 'GroupId') \
&& echo '\nINFERENCE_SG_ID='$INFERENCE_SG_ID

aws ec2 authorize-security-group-ingress \
--region $REGION \
--group-id $INFERENCE_SG_ID \
--protocol tcp \
--port 22 \
--source-group $BASTION_SG_ID

aws ec2 authorize-security-group-ingress \
--region $REGION \
--group-id $INFERENCE_SG_ID \
--protocol tcp \
--port 3000 \
--cidr 0.0.0.0/0
```

Great work! Onto part 3 :)

## Step 3: Create Subnets and Route Tables

Let's start by creating our two subnets: one in the Wavelength Zone using the
availability zone ID `WL_ZONE` using our environment variables set earlier and
one in the parent region (set by AWS).

```
export WL_SUBNET_ID=$(aws ec2 create-subnet \
--region $REGION \
--output text \
--cidr-block 10.0.0.0/24 \
--availability-zone $WL_ZONE \
--vpc-id $VPC_ID \
--query 'Subnet.SubnetId') \
&& echo '\nWL_SUBNET_ID='$WL_SUBNET_ID

BASTION_SUBNET_ID=$(aws ec2 create-subnet \
--region $REGION \
--output text \
--cidr-block 10.0.1.0/24 \
--vpc-id $VPC_ID \
--query 'Subnet.SubnetId') \
&& echo '\nBASTION_SUBNET_ID='$BASTION_SUBNET_ID
```

Now, let's create the route tables in each subnet, associate the route table to
each subnet, and add the corresponding routes to the internet and carrier
gateway, respectively.

```
export WL_RT_ID=$(aws ec2 create-route-table \
--region $REGION \
--output text \
--vpc-id $VPC_ID \
--query 'RouteTable.RouteTableId') \
&& echo '\nWL_RT_ID='$WL_RT_ID

aws ec2 associate-route-table \
--region $REGION \
--route-table-id $WL_RT_ID \
--subnet-id $WL_SUBNET_ID

aws ec2 create-route \
--region $REGION \
--route-table-id $WL_RT_ID \
--destination-cidr-block 0.0.0.0/0 \
--carrier-gateway-id $CAGW_ID

export BASTION_RT_ID=$(aws ec2 create-route-table \
--region $REGION \
--output text \
--vpc-id $VPC_ID \
--query 'RouteTable.RouteTableId') \
&& echo '\nBASTION_RT_ID='$BASTION_RT_ID

aws ec2 associate-route-table \
--region $REGION \
--subnet-id $BASTION_SUBNET_ID \
--route-table-id $BASTION_RT_ID

aws ec2 create-route \
--region $REGION \
--route-table-id $BASTION_RT_ID \
--destination-cidr-block 0.0.0.0/0 \
--gateway-id $IGW_ID
```

Lastly, to make provisioning the bastion host easier, modify the subnet
attributes to assign Public IPs by default to instances that are launched in the
subnet. Note that this will not affect instances launched in the Wavelength Zone
subnet.

```
aws ec2 modify-subnet-attribute \
--region $REGION \
--subnet-id $BASTION_SUBNET_ID \
--map-public-ip-on-launch
```

## Step 4: Create Elastic IP and Network Interface

The final step before deploying the inference server is to create an Elastic IP
to attach to our Wavelength Zone instance. This IP address will be assigned to
an Elastic Network Interfaces (ENIs) that will be attached to the instance we
create in Step 5.

```
export INFERENCE_CIP_ALLOC_ID=$(aws ec2 allocate-address \
--region $REGION \
--output text \
--domain vpc \
--network-border-group $NBG \
--query 'AllocationId') \
&& echo '\nINFERENCE_CIP_ALLOC_ID='$INFERENCE_CIP_ALLOC_ID

export INFERENCE_ENI_ID=$(aws ec2 create-network-interface \
--region $REGION \
--output text \
--subnet-id $WL_SUBNET_ID \
--groups $INFERENCE_SG_ID \
--query 'NetworkInterface.NetworkInterfaceId') \
&& echo '\nINFERENCE_ENI_ID='$INFERENCE_ENI_ID

aws ec2 --region $REGION associate-address \
--allocation-id $INFERENCE_CIP_ALLOC_ID \
--network-interface-id $INFERENCE_ENI_ID
```

Before you forget, take note of the Carrier IP address you just created. You
will need this IP when you visit `<your-carrier-ip>:3000` to launch the web app.

```
aws ec2 describe-addresses --allocation-ids $INFERENCE_CIP_ALLOC_ID \
--query 'Addresses[*].{"API server carrier (public) IP":CarrierIp}'
```

## Step 5: Deploy Inference Server on EC2

In our final step in configuring our AWS infrastructure, let's start by
launching the Wavelength Zone instance.

```
export INF_INSTANCE_ID=$(aws ec2 run-instances \
--region $REGION \
--instance-type g4dn.2xlarge \
--output text \
--network-interface '[{"DeviceIndex":0,"NetworkInterfaceId":"'$INFERENCE_ENI_ID'"}]' \
--image-id $INFERENCE_IMAGE_ID \
--query 'Instances[0].InstanceId' \
--key-name $KEY_NAME) \
&& echo '\nInference Server Instance ID' $INF_INSTANCE_ID

aws ec2 describe-instances --region $REGION --instance-ids $INF_INSTANCE_ID \
--query 'Reservations[0].Instances[0].{"Inference server private IP": PrivateIpAddress}'
```

This will output the private IP address of your instance, which should look
something like `10.0.1.XYZ`.

Next, create your Bastion Host in the parent region and print our the public IP
of the instance, which you will use to initiate the SSH connection. The IP
address should look something like `10.0.0.ABC`.

```
export BASTION_INSTANCE_ID=$(aws ec2 run-instances \
--region $REGION  \
--output text \
--instance-type t3.medium \
--associate-public-ip-address \
--subnet-id $BASTION_SUBNET_ID \
--image-id $BASTION_IMAGE_ID \
--query 'Instances[0].InstanceId' \
--security-group-ids $BASTION_SG_ID \
--key-name $KEY_NAME) \
&& echo '\nBastion Instance ID' $BASTION_INSTANCE_ID

aws ec2 describe-instances --region $REGION --instance-ids $BASTION_INSTANCE_ID \
--query 'Reservations[0].Instances[0].{"Bastion server public IP": PublicIpAddress}'
```

## Step 5b: Connect to the Inference Server

Since the Wavelength Zone does not allow internet ingress, we need to use the
parent region subnet as a "jumphost" to our Wavelength Zone. To do so, let's
connect to the bastion host.

```
ssh -i <your-key> -A ec2-user@<bastion-public-ip>
```

In my case, this might look something like
`ssh -i test_key.pem -A ec2-user@3.52.34.249`.

From there, you can immediately SSH onto the Wavelength Zone instance using the
same key pair. Note that this is automatically enabled through agent forwarding
(the -A flag you passed in the prior step).

```
ssh ubuntu@<your-inference-server-private-ip>
```

Congratulations! You're all set to launch the applications.
