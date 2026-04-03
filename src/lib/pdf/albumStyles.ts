import { StyleSheet, Font } from '@react-pdf/renderer';
import path from 'path';

// Define font using downloaded OTF files
Font.register({
  family: 'NotoSansJP',
  fonts: [
    { src: path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.otf') },
    { src: path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Bold.otf'), fontWeight: 'bold' }
  ]
});

export const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansJP',
    padding: 30,
    fontSize: 10,
    backgroundColor: '#ffffff'
  },
  pageLandscape: {
    fontFamily: 'NotoSansJP',
    padding: 30,
    fontSize: 12,
    backgroundColor: '#ffffff'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 4,
    marginBottom: 20
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  subtitle: {
    fontSize: 10
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    color: '#666'
  },
  
  // A4_PORTRAIT_2
  gridPort2: {
    flex: 1,
    flexDirection: 'column',
    gap: 16
  },
  cardPort2: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#999',
    padding: 10,
    gap: 15
  },
  imgPort2: {
    width: '50%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: '#f5f5f5'
  },
  infoPort2: {
    width: '50%',
    flexDirection: 'column'
  },
  photoNoPort2: {
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 5
  },
  
  // A4_PORTRAIT_4
  gridPort4: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between'
  },
  cardPort4: {
    width: '49%',
    height: '49%',
    borderWidth: 1,
    borderColor: '#999',
    padding: 5,
    flexDirection: 'column'
  },
  imgPort4: {
    height: '65%',
    objectFit: 'contain',
    backgroundColor: '#f5f5f5',
    marginBottom: 5
  },
  infoPort4: {
    height: '35%',
    fontSize: 8,
    flexDirection: 'column',
    overflow: 'hidden'
  },
  photoNoPort4: {
    fontWeight: 'bold',
    fontSize: 9,
    marginBottom: 2
  },

  // A4_LANDSCAPE_1
  cardLand1: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
    padding: 5
  },
  imgLand1: {
    width: '65%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ccc'
  },
  infoLand1: {
    width: '35%',
    borderLeftWidth: 1,
    borderLeftColor: '#ccc',
    paddingLeft: 15,
    paddingTop: 10
  },
  photoNoLand1: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10
  },
  
  // Common details
  row: {
    flexDirection: 'row',
    marginBottom: 4
  },
  label: {
    width: 35,
    color: '#555',
    fontSize: 9
  },
  val: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    paddingBottom: 2,
    minHeight: 13,
    fontSize: 9
  },
  memoTitle: {
    color: '#555',
    fontSize: 9,
    marginTop: 4,
    marginBottom: 2
  },
  memoVal: {
    flex: 1,
    fontSize: 9
  }
});
