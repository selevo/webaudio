/*

Этот файл  взял  из espruino 
Он передает данные на устройство  через UART  использую выход аудио смартфона.
 * This file is part of Espruino, a JavaScript interpreter for Microcontrollers
 *
 * Copyright (C) 2013 Gordon Williams <gw@pur3.co.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

var AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();

// some devices output an inverted waveform, some don't
// Некоторые устройства выводят перевернытый сигнал, некоторые нет, 
//установим по умолчанию  неперевернутый сигнал
var audio_serial_invert = false;

/**
Отправьте данную строку данных перед аудиопотоком.
Добавляет 1 -секундную преамбулу/почту, чтобы дать
Конденсаторное время для зарядки (поэтому мы получаем полные качели на 2 В
на выводе.
Если отправляете символы за пределами диапазона 0-255,
Они будут интерпретированы как перерыв (так что не передаются).
----------------------------------------------------------------------------------
Send the given string of data out over audio. 

    This adds a 1 second preamble/postable to give the 
    capacitor time to charge (so we get a full 2V swing 
    on the output.
 
   If you send characters outside the range 0-255,
   they will be interpreted as a break (so not transmitted).
*/
/*
функция ниже передает данные  и  что-то возвращает в переменной data, callback - непонятно пока что

 */
function audio_serial_write(data, callback)
    {
      var sampleRate = 44100;
      var header = sampleRate; // 1 sec to charge/discharge the cap
      var baud = 9600;
      
        /*  Следующая строка -  расчет сколько делать семплов(кусочков звука) на  1 байт данных
         1 байт  данный в  UART  это 10 бит: 1 бита старт,  8 бит  данные и 1 бит стоповый
         для чего делить на 11 -непонял, возможно заголовок звуковой "для разряда конденастора" хаха
         Возможно используется 9ти битный формат данных с проверкой четности.
         */
      var samplesPerByte = parseInt(sampleRate*11/baud); 
         
        /*
                Сейчас   посчитается  обзая длина  звукового буфера
             */
      var bufferSize = samplesPerByte*data.length/*samples*/ + header*2;

        //Создание   буфера
      var buffer = context.createBuffer(1, bufferSize, sampleRate);
      var b = buffer.getChannelData(0);

      for (var i=0;i<header;i++) b[i]=i / header;

      var offset = header;

      data.split("").forEach(function(c)
       {
            var byte = c.charCodeAt(0);
            if (byte>=0 && byte<=255)
            {    
              for (var i=0;i<samplesPerByte;i++)
                  {
                    var bit = Math.round(i*baud/sampleRate);
                    var value = 1;
                    if (bit==0) value=0; // start bit
                    else if (bit==9 || bit==10) value=1; // stop bits
                    else value = (byte&(1<<(bit-1))) ? 1 : 0; // data
                     b[offset++] = value*2-1; 
                  }
            }     else {
                      // just insert a pause
                      for (var i=0;i<samplesPerByte;i++) 
                    b[offset++] = 1; 
                   }    
      });

      for (var i=0;i<header;i++) b[offset+i]=1-(i / header);

      if (audio_serial_invert)
        for (var i=0;i<bufferSize;i++) b[i] = 1-b[i];// интересное решение -инвертировние вычитанием из единицы!

      var source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start(); // Запуск аудиопередачи

      if (callback)  // Здесь какая-то обратная связь, запускает callback через  время = 1000*bufferSize/sampleRate
        window.setTimeout(callback, 1000*bufferSize/sampleRate);
}
