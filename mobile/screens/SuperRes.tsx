import { StatusBar } from 'expo-status-bar';
import React, {useState} from 'react';
import { Alert, Button, Text, View, NativeModules, Image, ScrollView, ToastAndroid } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { StackScreenProps } from '@react-navigation/stack';
import * as ort from 'onnxruntime-react-native';
import { Asset } from 'expo-asset';
import { pixelsRGBToYCbCr, pixelsYCbCrToRGB } from '../misc/utilities';
import { RootParamList } from './NavigStack';
import { styles } from '../misc/styles';


let model: ort.InferenceSession;
let isLoaded = false;
const [imgHeight, imgWidth] = [224, 224]
const [postImgHeight, postImgWidth] = [imgHeight*3, imgWidth*3]


let floatPixelsY = new Float32Array()
let cbArray = new Array<number>()
let crArray = new Array<number>()

let bitmapPixel: number[] = Array(imgHeight*imgWidth);
let bitmapScaledPixel: number[] = Array(postImgHeight*postImgWidth);

const bitmapModule = NativeModules.Bitmap
type SuperScreenProps = StackScreenProps<RootParamList, "Super_Resolution">

export default function SuperRes({navigation, route}: SuperScreenProps ) {
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [outputImage, setOutputImage] = useState<any>(null);
  const [myModel, setModel] = useState(model);

  async function openImagePickerAsync() {
  
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
    if (permissionResult.granted === false) {
      alert("Permission to access Camera Roll is Required!");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync();
    
    if (pickerResult.cancelled === true) {
      return;
    }

    const imageResult = await ImageManipulator.manipulateAsync(
      pickerResult.uri, [
        {resize: {height: imgHeight, width: imgWidth}}
      ]
    )

    const imageScaled = await ImageManipulator.manipulateAsync(
      pickerResult.uri, [
        {resize: {height: postImgHeight, width: postImgWidth}}
      ]
    )

    bitmapPixel = await bitmapModule.getPixels(imageResult.uri).then(

      (image: any) => {
        return Array.from(image.pixels);
      }
    )

    bitmapScaledPixel = await bitmapModule.getPixels(imageScaled.uri).then(
      (image: any) => {
        return Array.from(image.pixels);
      }
    )

    setSelectedImage({ 
      localUri: imageResult.uri,
      localHeight: imageResult.height,
      localWidth: imageResult.width 
    });

    setOutputImage(null)

    return

    
  };


  async function preprocess(): Promise<ort.Tensor> {  
    floatPixelsY = Float32Array.from(bitmapPixel)
    cbArray = Array.from(bitmapScaledPixel)
    crArray = Array.from(bitmapScaledPixel)

    bitmapPixel.forEach((value, index) => {

      floatPixelsY[index] = pixelsRGBToYCbCr(value, "y")
    });

    bitmapScaledPixel.forEach((value, index) => {
      cbArray[index] = pixelsRGBToYCbCr(value, "cb")
      crArray[index] = pixelsRGBToYCbCr(value, "cr")
    })
    let tensor: ort.Tensor = new ort.Tensor(floatPixelsY, [1, 1, imgHeight, imgWidth])
    return tensor
  };

  async function postprocess(floatArray: Array<number>): Promise<string> {  
    const intArray = Array(postImgHeight*postImgWidth);


    floatArray.forEach((value, index) => {
      intArray[index] = pixelsYCbCrToRGB(value, cbArray[index], crArray[index])
    })


    let imageUri = await bitmapModule.getImageUri(intArray).then(
      (image:any) => {

        return image.uri
      }
    )

    const imageRotated = await ImageManipulator.manipulateAsync(imageUri, [
      {rotate: 90},
      {flip: ImageManipulator.FlipType.Horizontal}
    ])
    
    setOutputImage({ localUri: imageRotated.uri })
    return imageUri
  };
  

  async function loadModel() {
    try {
      const assets = await Asset.loadAsync(require('../assets/super_resnet12.ort'));
      const modelUri = assets[0].localUri;
      if (!modelUri) {
        Alert.alert('failed to get model URI', `${assets[0]}`);
      } else {
        setModel(await ort.InferenceSession.create(modelUri));
        return

        }

    } catch (e) {
      Alert.alert('failed to load model', `${e}`);
      throw e;
    }
  };

  async function runModel() {
    try {
      
      const feeds:Record<string, ort.Tensor> = {};

      if (bitmapPixel.length == imgHeight*imgWidth) {
        
        feeds[myModel.inputNames[0]] = await preprocess();
      } else{
        Alert.alert("No Image selected", "You need to upload and/or show image")
        return
      }
      const fetches = await myModel.run(feeds);
      const output = fetches[myModel.outputNames[0]];
      if (!output) {
        Alert.alert('failed to get output', `${myModel.outputNames[0]}`);
      }else {
        const out = output.data as Float32Array;
        const array = Array.from(out);
        await postprocess(array);
        ToastAndroid.show('SUPER_RESOLUTION DONE\n  SWYPE RIGHT', ToastAndroid.LONG)
      }
    } catch (e) {
      Alert.alert('failed to inference model', `${e}`);
      throw e;
    }
  };

  if (!isLoaded) {
    loadModel().then(() => {
      isLoaded = true;
    })
    
  } 

  return (
    <View style={styles.container}>
      <Text style={styles.item}>Using ONNX Runtime in React Native to perform Super Resolution on Images</Text>
      <ScrollView horizontal style= {styles.scrollView}>
        {
          selectedImage !== null &&
          <Image
            source={{ uri: selectedImage.localUri }}
            style={styles.thumbnail}
          />}
        {
          outputImage !== null &&
          <Image
            source={{ uri: outputImage.localUri }}
            style={styles.thumbnail}
          />
        }
      </ScrollView>
      <View style={styles.userInput}>
        <Button title='Upload Image' onPress={openImagePickerAsync} color="#219ebc"/>
        {isLoaded && selectedImage !== null &&
        <Button title='Process Image' onPress={runModel} color="#219ebc"/>
        }
      </View>
      <StatusBar style="auto" />
    </View>
  );
};





