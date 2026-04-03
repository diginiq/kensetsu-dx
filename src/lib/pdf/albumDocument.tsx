import React from 'react';
import { Document, Page, Text, View, Image as PdfImage } from '@react-pdf/renderer';
import { styles } from './albumStyles';

export interface PdfPhoto {
  photoNumber: string;
  workType: string;
  location: string;
  date: string;
  memo: string;
  /** Buffer of the jpeg image */
  imageBuffer: Buffer;
}

interface Props {
  siteName: string;
  layout: 'A4_PORTRAIT_2' | 'A4_PORTRAIT_4' | 'A4_LANDSCAPE_1';
  pages: PdfPhoto[][];
}

export function AlbumDocument({ siteName, layout, pages }: Props) {
  const isLandscape = layout === 'A4_LANDSCAPE_1';
  const orientation = isLandscape ? 'landscape' : 'portrait';

  return (
    <Document>
      {pages.map((pagePhotos, pageIndex) => (
        <Page
          key={pageIndex}
          size="A4"
          orientation={orientation}
          style={isLandscape ? styles.pageLandscape : styles.page}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{siteName}</Text>
          </View>

          {/* Body */}
          {layout === 'A4_PORTRAIT_2' && (
            <View style={styles.gridPort2}>
              {pagePhotos.map((p, i) => (
                <View key={i} style={styles.cardPort2}>
                  <PdfImage src={p.imageBuffer} style={styles.imgPort2} />
                  <View style={styles.infoPort2}>
                    <Text style={styles.photoNoPort2}>{p.photoNumber}</Text>
                    <View style={styles.row}>
                      <Text style={styles.label}>工種:</Text>
                      <Text style={styles.val}>{p.workType}</Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.label}>箇所:</Text>
                      <Text style={styles.val}>{p.location}</Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.label}>日付:</Text>
                      <Text style={styles.val}>{p.date}</Text>
                    </View>
                    <Text style={styles.memoTitle}>メモ:</Text>
                    <Text style={styles.memoVal}>{p.memo}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {layout === 'A4_PORTRAIT_4' && (
            <View style={styles.gridPort4}>
              {pagePhotos.map((p, i) => (
                <View key={i} style={styles.cardPort4}>
                  <PdfImage src={p.imageBuffer} style={styles.imgPort4} />
                  <View style={styles.infoPort4}>
                    <Text style={styles.photoNoPort4}>{p.photoNumber}</Text>
                    <Text style={{ marginBottom: 2 }}>工種: {p.workType}</Text>
                    <Text>箇所: {p.location}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {layout === 'A4_LANDSCAPE_1' && (
            <View style={{ flex: 1 }}>
              {pagePhotos.map((p, i) => (
                <View key={i} style={styles.cardLand1}>
                  <PdfImage src={p.imageBuffer} style={styles.imgLand1} />
                  <View style={styles.infoLand1}>
                    <Text style={styles.photoNoLand1}>{p.photoNumber}</Text>
                    <View style={styles.row}>
                      <Text style={styles.label}>工種:</Text>
                      <Text style={styles.val}>{p.workType}</Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.label}>箇所:</Text>
                      <Text style={styles.val}>{p.location}</Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.label}>日付:</Text>
                      <Text style={styles.val}>{p.date}</Text>
                    </View>
                    <Text style={styles.memoTitle}>メモ:</Text>
                    <Text style={styles.memoVal}>{p.memo}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Footer */}
          <Text style={styles.footer} render={({ pageNumber, totalPages }) => `ページ ${pageNumber} / ${totalPages}`} fixed />
        </Page>
      ))}
    </Document>
  );
}
